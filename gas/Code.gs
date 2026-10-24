/**
 * SEKIYA.so 入居確定フォーム 受け口（Google Apps Script Web アプリ）
 *
 * スクリプトプロパティ（プロジェクトの設定 → スクリプト プロパティ）に入れる値:
 *   LIFF_CHANNEL_ID    … ミニアプリ（LIFF）を作ったチャネルのチャネルID（数字）
 *   SEKIYA_LINE_TOKEN  … SEKIYA.so公式アカウントのチャネルアクセストークン（入居者への通知用）
 * トークンはここ（コード）には書かない。
 */

// スプレッドシート「入居者顧客情報」の 拡張機能 → Apps Script から作る（コンテナバインド）前提
const SHEET_NAME = 'SEKIYA.so入居確定フォーム';
const HEADER_ROW = 2;
const TEXT_COLUMNS = ['電話番号', '在留カード番号'];

// 手続き状況の順序（表示・進捗計算に使う）
const PHASES = ['受付', '審査中', '契約書送付', '契約締結', '入居確認', '入居完了'];

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const props = PropertiesService.getScriptProperties();

    // クラウドサイン Webhook（event_type フィールドがある場合）
    if (body.event_type) {
      try { handleCloudsign_(body, props); } catch (err) { console.error('cloudsign handler: ' + err); }
      return json_({ ok: true });
    }

    let profile;
    try {
      profile = verifyIdToken_(body.idToken, props.getProperty('LIFF_CHANNEL_ID'));
    } catch (err) {
      console.warn('id token rejected: ' + err);
      return json_({ ok: false, code: 'token', error: 'invalid id token' });
    }

    const answers = sanitize_(body.answers || {});
    const record = Object.assign({}, answers, {
      'タイムスタンプ': new Date(),
      'LINE表示名': profile.name || '',
      'LINE userId': profile.sub,
      '手続き状況': '受付',
    });

    const pos = appendByHeader_(record);

    try {
      notifyApplicant_(props, record);
    } catch (err) {
      console.error('notify failed: ' + err);
    }
    return json_({ ok: true });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: String((err && err.message) || err) });
  }
}

function doGet(e) {
  const params = (e && e.parameter) || {};

  // 申請状況照会: ?action=status&idToken=<LIFF IDトークン>
  if (params.action === 'status') {
    const props = PropertiesService.getScriptProperties();
    let profile;
    try {
      profile = verifyIdToken_(params.idToken, props.getProperty('LIFF_CHANNEL_ID'));
    } catch (err) {
      return json_({ ok: false, code: 'token', error: 'invalid id token' });
    }
    const row = findRowByUserId_(profile.sub);
    if (!row) return json_({ ok: true, found: false });
    return json_({
      ok: true, found: true,
      status: row['手続き状況'] || '受付',
      name: [row['姓'], row['名']].filter(Boolean).join(' '),
      moveIn: row['入居開始日'] || '',
      moveOut: row['退去予定日'] || '',
      phases: PHASES,
    });
  }

  return json_({ ok: true, service: 'sekiya-entry' });
}

// クラウドサイン Webhook: POST で届く
// スクリプトプロパティ:
//   CLOUDSIGN_SECRET    … クラウドサインのWebhookシークレット（空でも動くが推奨）
//   SEKIYA_LINE_TOKEN   … SEKIYA.so公式アカウントのチャネルアクセストークン（入居者への通知用）
function handleCloudsign_(body, props) {
  // event_type が document.completed のときだけ動く
  if (body.event_type !== 'document.completed') return;

  const doc = body.document || {};
  // 署名者のメールアドレス一覧を抽出
  const emails = (doc.participants || []).map(function (p) { return (p.email || '').toLowerCase(); }).filter(Boolean);
  if (!emails.length) return;

  // シートからメールアドレスが一致する行を探す
  let targetRow = null;
  for (const email of emails) {
    targetRow = findRowByEmail_(email);
    if (targetRow) break;
  }
  if (!targetRow) { console.warn('cloudsign: no matching row for emails: ' + emails.join(',')); return; }

  // 手続き状況を「契約締結」に更新
  updateStatus_(targetRow._rowIndex, '契約締結');

  // 入居者のLINEに通知（SEKIYA.so公式アカウントから）
  const lineToken = props.getProperty('SEKIYA_LINE_TOKEN');
  const userId = targetRow['LINE userId'];
  if (!lineToken || !userId) { console.warn('cloudsign: SEKIYA_LINE_TOKEN or LINE userId missing'); return; }

  const name = [targetRow['姓'], targetRow['名']].filter(Boolean).join(' ') || targetRow['LINE表示名'] || '';
  const text = [
    `${name}さん、SEKIYA.soの入居契約が締結されました！`,
    '',
    '入居までの最終ご案内を公式LINEよりお送りします。',
    'ご不明な点は、このトークでお気軽にご連絡ください。',
  ].join('\n');

  const res = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + lineToken },
    payload: JSON.stringify({ to: userId, messages: [{ type: 'text', text }] }),
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) throw new Error('LINE push failed: ' + res.getContentText());
}

function verifyIdToken_(idToken, channelId) {
  if (!idToken) throw new Error('missing id token');
  if (!channelId) throw new Error('LIFF_CHANNEL_ID is not set');
  const res = UrlFetchApp.fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'post',
    payload: { id_token: idToken, client_id: channelId },
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) throw new Error(res.getContentText());
  const data = JSON.parse(res.getContentText());
  if (!data.sub) throw new Error('no sub in token');
  return data;
}

function sanitize_(answers) {
  const out = {};
  Object.keys(answers).forEach(function (k) {
    if (typeof k !== 'string' || k.length > 80) return;
    let v = answers[k];
    if (v === null || v === undefined) v = '';
    v = String(v).slice(0, 2000);
    out[k] = v;
  });
  return out;
}

// 見出し名で列を合わせて1行追加する。無い見出しは右端に足す。
function appendByHeader_(record) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    const lastCol = Math.max(sheet.getLastColumn(), 1);
    const headers = sheet.getRange(HEADER_ROW, 1, 1, lastCol).getValues()[0].map(String);

    Object.keys(record).forEach(function (key) {
      if (headers.indexOf(key) === -1) {
        headers.push(key);
        sheet.getRange(HEADER_ROW, headers.length).setValue(key);
      }
    });

    const values = headers.map(function (h) {
      if (!(h in record)) return '';
      const v = record[h];
      if (v instanceof Date) return v;
      return toCell_(h, v);
    });

    const rowIndex = Math.max(sheet.getLastRow(), HEADER_ROW) + 1;
    sheet.getRange(rowIndex, 1, 1, values.length).setValues([values]);
    return { row: rowIndex, gid: sheet.getSheetId(), url: ss.getUrl() };
  } finally {
    lock.releaseLock();
  }
}

// LINE userId でシートの行を探し、{列見出し: 値, _rowIndex} を返す
function findRowByUserId_(userId) {
  return findRowBy_('LINE userId', userId);
}

// メールアドレス（小文字）でシートの行を探す
function findRowByEmail_(email) {
  return findRowBy_('メールアドレス', email);
}

function findRowBy_(colName, value) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const lastRow = sheet.getLastRow();
  if (lastRow <= HEADER_ROW) return null;
  const headers = sheet.getRange(HEADER_ROW, 1, 1, lastCol).getValues()[0].map(String);
  const colIdx = headers.indexOf(colName);
  if (colIdx === -1) return null;
  const data = sheet.getRange(HEADER_ROW + 1, 1, lastRow - HEADER_ROW, lastCol).getValues();
  for (let i = data.length - 1; i >= 0; i--) { // 最新行を優先
    if (String(data[i][colIdx]).toLowerCase() === String(value).toLowerCase()) {
      const row = {};
      headers.forEach(function (h, j) { row[h] = data[i][j]; });
      row._rowIndex = HEADER_ROW + 1 + i;
      return row;
    }
  }
  return null;
}

// 指定行の「手続き状況」列を更新する
function updateStatus_(rowIndex, status) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    const lastCol = Math.max(sheet.getLastColumn(), 1);
    const headers = sheet.getRange(HEADER_ROW, 1, 1, lastCol).getValues()[0].map(String);
    let colIdx = headers.indexOf('手続き状況');
    if (colIdx === -1) {
      headers.push('手続き状況');
      colIdx = headers.length - 1;
      sheet.getRange(HEADER_ROW, colIdx + 1).setValue('手続き状況');
    }
    sheet.getRange(rowIndex, colIdx + 1).setValue(status);
  } finally {
    lock.releaseLock();
  }
}

// 数式として解釈されないように、また先頭の0が消えないようにする
function toCell_(header, v) {
  const s = String(v);
  if (s === '') return '';
  if (TEXT_COLUMNS.indexOf(header) !== -1) return "'" + s;
  if (/^[=+\-@]/.test(s)) return "'" + s;
  return s;
}

function notifyApplicant_(props, r) {
  const token = props.getProperty('SEKIYA_LINE_TOKEN');
  const to = r['LINE userId'];
  if (!token || !to) return;

  const name = [r['姓'], r['名']].filter(Boolean).join('') || r['LINE表示名'] || '';
  const text = [
    `${name}さん、SEKIYA.soへのお申し込みを受け付けました。`,
    '',
    '内容を確認次第、改めてご連絡いたします。',
    'ご不明な点はこのトークからお気軽にどうぞ。',
  ].join('\n');

  const res = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify({ to: to, messages: [{ type: 'text', text }] }),
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) throw new Error(res.getContentText());
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// 手続き状況が変わったら入居者のLINEに自動通知（installable onEdit）
// 初回1回だけ setupTrigger() をエディタから手動実行すること
// ============================================================

// スプレッドシートの「手続き状況」列の値が変わったときに発火
function onStatusChange(e) {
  try {
    const sheet = e.source.getSheetByName(SHEET_NAME);
    if (!sheet || e.source.getActiveSheet().getName() !== SHEET_NAME) return;

    const range = e.range;
    const lastCol = Math.max(sheet.getLastColumn(), 1);
    const headers = sheet.getRange(HEADER_ROW, 1, 1, lastCol).getValues()[0].map(String);
    const statusCol = headers.indexOf('手続き状況') + 1; // 1-indexed
    if (statusCol === 0) return;

    // 変更されたセルが「手続き状況」列かどうか
    if (range.getColumn() > statusCol || range.getColumn() + range.getNumColumns() - 1 < statusCol) return;
    if (range.getRow() <= HEADER_ROW) return; // ヘッダー行は無視

    const newStatus = String(e.value || '').trim();
    if (!newStatus || PHASES.indexOf(newStatus) === -1) return;

    // 同じ行から LINE userId を取得
    const row = range.getRow();
    const userIdCol = headers.indexOf('LINE userId') + 1;
    const nameLastCol = headers.indexOf('姓') + 1;
    const nameFirstCol = headers.indexOf('名') + 1;
    const lineNameCol = headers.indexOf('LINE表示名') + 1;
    if (userIdCol === 0) return;

    const userId = sheet.getRange(row, userIdCol).getValue();
    if (!userId) return;

    const nameLast = nameLastCol ? sheet.getRange(row, nameLastCol).getValue() : '';
    const nameFirst = nameFirstCol ? sheet.getRange(row, nameFirstCol).getValue() : '';
    const lineName = lineNameCol ? sheet.getRange(row, lineNameCol).getValue() : '';
    const name = [nameLast, nameFirst].filter(Boolean).join(' ') || lineName || '';

    const props = PropertiesService.getScriptProperties();
    const lineToken = props.getProperty('SEKIYA_LINE_TOKEN');
    if (!lineToken) { console.warn('SEKIYA_LINE_TOKEN not set'); return; }

    const text = buildStatusMessage_(name, newStatus);
    const res = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + lineToken },
      payload: JSON.stringify({ to: String(userId), messages: [{ type: 'text', text }] }),
      muteHttpExceptions: true,
    });
    if (res.getResponseCode() !== 200) console.error('LINE push failed: ' + res.getContentText());
  } catch (err) {
    console.error('onStatusChange error: ' + err);
  }
}

function buildStatusMessage_(name, status) {
  const prefix = name ? name + 'さん、' : '';
  const messages = {
    '審査中':     prefix + 'SEKIYA.soの入居申請を受け付けました。現在内容を審査中です。',
    '契約書送付': prefix + '入居契約書を送付しました。ご確認のうえご署名をお願いします。',
    '契約締結':   prefix + '入居契約の締結が完了しました！入居までの最終案内をお送りします。',
    '入居確認':   prefix + '入居当日の準備が整いました。当日お待ちしています！',
    '入居完了':   prefix + 'SEKIYA.soへようこそ！ご不明な点はいつでもこちらでどうぞ。',
  };
  return messages[status] || prefix + '手続き状況が「' + status + '」に更新されました。';
}

// エディタから1回だけ手動実行してトリガーを登録する
function setupTrigger() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  // 重複登録を防ぐ
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'onStatusChange') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('onStatusChange').forSpreadsheet(ss).onEdit().create();
  console.log('✅ onStatusChange トリガーを登録しました');
}

// エディタから手動で実行して、通知の設定を確かめる用
function testNotify() {
  notify_(PropertiesService.getScriptProperties(), {
    '姓': 'テスト', '名': '太郎', '国籍区分': '日本以外の国籍', '国籍': '大韓民国', '在留資格': '特定活動',
    '部屋タイプ': '個室', '入居開始日': '2026/11/01', '退去予定日': '2027/04/30', 'LINE表示名': 'test',
  }, { row: HEADER_ROW + 1, gid: 0, url: SpreadsheetApp.getActiveSpreadsheet().getUrl() });
}
