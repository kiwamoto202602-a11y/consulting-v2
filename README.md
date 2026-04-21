# 融資支援管理システム

銀行融資支援コンサルティング向けの顧客・案件一元管理Webアプリ。

## 公開URL

https://kiwamoto202602-a11y.github.io/consulting-v2/

## 技術構成

| 項目 | 内容 |
|------|------|
| 実装 | index.html（HTML/CSS/JS 一体型） |
| DB・認証 | Firebase Firestore / Firebase Auth |
| ファイル | Firebase Storage |
| CSS | Tailwind CSS（CDN） |
| ホスティング | GitHub Pages（mainブランチ直配信） |

## 主な機能

- ログイン認証（メール＋パスワード）
- ダッシュボード（KPI・ステータス分布・未完了タスク一覧）
- 顧客管理 CRUD（検索・絞り込み対応）
- 案件管理 CRUD（ステータス7段階・タスク・必要書類チェックリスト）
- ファイルアップロード（Firebase Storage・画像自動圧縮）
- レスポンシブ対応

## Firebase 初期設定

1. [Firebase Console](https://console.firebase.google.com/) でプロジェクト `consulting-37154` を開く
2. Authentication → メール/パスワードを有効化
3. Firestore → 以下のセキュリティルールを設定

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

4. Storage → 以下のセキュリティルールを設定

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## デプロイ手順

```bash
git add index.html
git commit -m "update"
git push origin main
```

pushから約1分でGitHub Pagesに反映される。

## アカウント管理

ユーザー追加はFirebase Console → Authentication → ユーザーを追加 から手動で行う。
