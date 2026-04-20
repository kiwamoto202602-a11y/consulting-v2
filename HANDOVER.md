# プロジェクト引き継ぎ資料 (HANDOVER)

---

## プロジェクト基本情報

| 項目 | 内容 |
|------|------|
| アプリ名 | 融資支援管理システム |
| 用途・目的 | 銀行融資支援コンサルティング向けの顧客・案件を一元管理するシステム |
| GitHubアカウント名 | kiwamoto202602-a11y |
| GitHubリポジトリ名 | consulting-v2 |
| 公開URL | https://kiwamoto202602-a11y.github.io/consulting-v2/ |

---

## 技術構成

| 項目 | 内容 |
|------|------|
| DB | Firebase Firestore (compat SDK v10.12.0) |
| プロジェクトID | `consulting-37154` |
| 認証方式 | Firebase Authentication（メール＋パスワード） |
| ファイル保存先 | Firebase Storage |
| ホスティング | GitHub Pages（`main` ブランチの `index.html` を直接配信） |
| 実装形式 | **単一HTMLファイル**（`index.html` 1ファイルにHTML/CSS/JSをすべて記述） |
| CSSフレームワーク | Tailwind CSS (CDN) |

### Firebase SDK 読み込み（CDN compat 方式）
```html
<script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-storage-compat.js"></script>
```

### Firebase 設定値
```js
const firebaseConfig = {
  apiKey: "AIzaSyDRGq-1d5nvrOtlToYd5lLcsTfosijgFzo",
  authDomain: "consulting-37154.firebaseapp.com",
  projectId: "consulting-37154",
  storageBucket: "consulting-37154.firebasestorage.app",
  appId: "1:502558740127:web:1b01f4325585ca0e9ddcaa"
};
```

---

## データ構造

Firestore コレクション一覧：

| コレクション名 | 役割 |
|--------------|------|
| `clients` | 顧客情報（顧客名・業種・担当者・連絡先など） |
| `cases` | 案件情報（顧客ID・融資種別・金額・ステージ・担当者など） |
| （未記入） | その他コレクションは index.html 内参照 |

---

## 主要機能

### 実装済み

- **認証** ― Firebase Auth によるメール/パスワードログイン・ログアウト
- **ダッシュボード** ― KPI・進行中案件・直近活動の表示
- **顧客管理（CRUD）** ― 顧客一覧・新規作成・編集・削除
- **案件管理（CRUD）** ― 案件一覧・新規作成・編集・ステージ管理
- **レスポンシブ対応** ― モバイル表示（サイドバー開閉）

---

## 現在の状態

| 項目 | 内容 |
|------|------|
| 完成度 | （未記入） |
| 状態 | **開発中** |

---

## 進行中の作業

（未記入）

---

## 次にやること（優先順）

（未記入）

---

## 未解決の課題・既知のバグ

| # | 内容 | 優先度 |
|---|------|--------|
| 1 | （未記入） | （未記入） |

---

## 注意事項・独自ルール

- **単一HTMLファイル構成**：HTML/CSS/JSがすべて `index.html` に記述されているため、分割しないこと
- **Firebase compat SDK を使用**：モジュラーSDK（v9+）ではなく compat 版（`firebase.firestore()` 形式）で統一
- **GitHub Pages で直接配信**：ビルドプロセスなし。`main` ブランチの `index.html` を直接 push すれば即反映
- **Tailwind CSS**：CDN版を使用（`https://cdn.tailwindcss.com`）

---

## 直近で編集したファイルと箇所

| ファイル名 | 箇所 | 内容 |
|-----------|------|------|
| `index.html` | （未記入） | （未記入） |

---

## コミット履歴（直近）

| ハッシュ | 内容 |
|---------|------|
| 4a86686 | docs: add skill activation policy to CLAUDE.md |
| 72d7924 | （未記入） |

---

*このファイルは Claude (Cowork mode) により自動生成されました。*
