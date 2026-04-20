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

| コレクション名 | 役割 | 主要フィールド |
|--------------|------|--------------|
| `clients` | 顧客情報 | `name` / `industry` / `representative` / `representativeTitle` / `email` / `phone` / `address` / `notes` / `createdAt` / `updatedAt` |
| `cases` | 案件情報 | `clientId` / `clientName` / `title` / `bankName` / `status`（7段階）/ `deadline` / `tasks`（配列）/ `createdAt` / `updatedAt` |

Firebase Storage：顧客・案件の添付ファイル（画像は自動圧縮あり）

---

## 主要機能

### 実装済み

- **認証** ― Firebase Auth によるメール/パスワードログイン・ログアウト（サインアップは管理者が手動追加）
- **ダッシュボード** ― KPI（顧客数・進行中案件・今月承認・期限7日以内）、ステータス分布、未完了タスク一覧
- **顧客管理（CRUD）** ― 顧客一覧・新規・編集・削除・検索（名前／業種／代表者）
- **案件管理（CRUD）** ― 案件一覧・新規・編集・削除・ステータス7段階管理
- **案件内サブ機能** ― タスク管理、必要書類チェックリスト（デフォルト13件）
- **ファイル機能** ― Firebase Storage へのアップロード／一覧／ダウンロード／削除、画像は自動圧縮
- **レスポンシブ対応** ― モバイル表示（サイドバー開閉）
- **UI補助** ― トースト通知

### 未実装

- サインアップ／パスワードリセット UI
- 活動ログ、CSV/PDF 出力、メール通知、権限管理、カンバン UI

---

## 現在の状態

| 項目 | 内容 |
|------|------|
| 完成度 | 約 65〜70%（コア CRUD・ダッシュボード・ファイル・レスポンシブは稼働。セキュリティ対策・高度機能が未対応） |
| 状態 | **開発中** |

---

## 進行中の作業

現時点でアクティブな実装タスクなし（直近コミットは HANDOVER.md 追加のみ）。

---

## 次にやること（優先順）

1. **XSS 対策（最優先）** ― ユーザ入力を `innerHTML` で直接挿入している箇所を `textContent` またはエスケープ処理に置換
2. サイレント failure となっている catch ブロックに最低限のエラーログ／ユーザ通知を追加
3. フォームバリデーション強化（必須項目・メール形式・日付妥当性）
4. 動作確認チェックリスト（CLAUDE.md セクション A/B）の一括実施
5. 機能拡張候補：CSV 出力、活動ログ、権限管理

---

## 未解決の課題・既知のバグ

| # | 内容 | 優先度 |
|---|------|--------|
| 1 | ユーザ入力を `innerHTML` で直接挿入しており XSS 脆弱性の可能性（index.html:195, 319, 358 ほか） | 高 |
| 2 | オートセーブ失敗がサイレントで握り潰される（index.html:1054） | 中 |
| 3 | 複数の空 catch ブロックでエラーログ無し（index.html:559, 568, 1106, 1249） | 中 |
| 4 | `deadline.toDate()` 前提のため型不整合時にクラッシュする可能性（index.html:337-339） | 低 |
| 5 | フォームバリデーションが `name` 必須チェックのみで不足 | 低 |

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
| `HANDOVER.md` | 全体 | index.html 精査結果に基づき完成度・コレクション構造・既知バグ・次タスクを更新 |

---

## コミット履歴（直近）

| ハッシュ | 内容 |
|---------|------|
| 4a86686 | docs: add skill activation policy to CLAUDE.md |
| 72d7924 | （未記入） |

---

*このファイルは Claude (Cowork mode) により自動生成されました。*
