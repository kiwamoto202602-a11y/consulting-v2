# consulting-v2 プロジェクト設定



## テンプレート変数の展開値



| 変数 | 値 |

|---|---|

| `{{PROJECT_NAME}}` | コンサル管理 |

| `{{CLIENT_NAME}}` | (クライアント名未設定) |

| `{{DB_STACK}}` | Firebase |

| `{{REPO_NAME}}` | consulting-v2 |

| `{{GHPAGES_URL}}` | https://kiwamoto202602-a11y.github.io/consulting-v2 |

| `{{FIREBASE_PROJECT_ID}}` | consulting-37154 |

| `{{SUPABASE_PROJECT_REF}}` | (Firebase使用のため該当なし) |

| `{{MONTHLY_PLAN}}` | (記入) |



## プロジェクト固有情報



### 技術スタック

- **DB**: Firebase Firestore

- **認証**: Firebase Auth

- **ファイル保存**: Google Drive(クライアントアカウント使用)

- **公開**: GitHub Pages



### アプリ概要

コンサルティング業務管理アプリ(consulting-v2)。

ファイル保存にGoogle Driveを使用する点が他アプリと異なる。



## プロジェクト固有のルール・メモ



### Google Drive連携の注意

- ファイル保存先がクライアントアカウントのGoogle Drive

- クライアント側で管理責任を持つ

- Drive APIの認証設定が必要



## 更新履歴



| 日付 | 内容 |

|---|---|

| 2026-04-23 | 新雛形CLAUDE.md適用、CLAUDE.local.md初版作成 |

