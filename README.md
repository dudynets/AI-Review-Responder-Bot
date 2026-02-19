<a href="https://dudynets.dev">
  <img src="https://dudynets.dev/assets/brand/icon-light-rounded.png" alt="drawing" width="128"/>
</a>

# AI Review Responder Bot

<p><strong>A Telegram bot that fetches unanswered app reviews from Google Play and App Store Connect, generates AI-powered replies using OpenAI, and lets you publish them with a single tap.</strong></p>

> Developed by [Oleksandr Dudynets](https://dudynets.dev)

## Features

- Fetches reviews without a developer response from Google Play and App Store Connect.
- Translates reviews into your preferred language for display in Telegram.
- Generates replies in the reviewer's language using OpenAI, with a translation shown alongside.
- One-tap **Send Reply** button to publish the response to the store.
- **Reply to a message** with comments to regenerate the AI reply with your adjustments.
- Scheduled polling at a configurable interval, plus an on-demand `/check` command.
- Multi-app support across both platforms.
- Built-in **mock platform** for testing without real store credentials.
- SQLite database to track processed reviews and persist state across restarts.

## Prerequisites

- **Bun** >= 1.0
- A **Telegram bot** created via [@BotFather](https://t.me/BotFather)
- An **OpenAI API key**
- **Google Play** service account credentials (if monitoring Android apps)
- **App Store Connect** API key (if monitoring iOS apps)

## Setup

### 1. Clone and install

```bash
git clone https://github.com/dudynets/AI-Review-Responder-Bot.git
cd AI-Review-Responder-Bot
bun install
```

### 2. Create a Telegram bot

1. Message [@BotFather](https://t.me/BotFather) on Telegram and send `/newbot`.
2. Follow the prompts and copy the **bot token**.
3. To find your **chat ID**, send a message to your bot, then visit:

```
 https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates
```

Look for `"chat":{"id": ...}` in the response.

### 3. Get an OpenAI API key

1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys).
2. Create a new API key.

### 4. Set up Google Play credentials (optional)

Skip this step if you only monitor iOS apps.

1. In the [Google Cloud Console](https://console.cloud.google.com/), create or select a project.
2. Enable the **Google Play Android Developer API**.
3. Under **IAM & Admin > Service Accounts**, create a service account and download the JSON key file.
4. In the [Google Play Console](https://play.google.com/console), go to **Users and permissions**, invite the service account's email, and grant **"Reply to reviews"** permission.
5. Place the JSON key file at `credentials/service-account.json` (or set a custom path in `.env`).

### 5. Set up App Store Connect credentials (optional)

Skip this step if you only monitor Android apps.

1. In [App Store Connect > Users and Access > Integrations > App Store Connect API](https://appstoreconnect.apple.com/access/integrations/api), click **Generate API Key**.
2. Select a role with **Customer Reviews** permission (e.g., Admin or App Manager).
3. Note the **Key ID** and **Issuer ID**.
4. Download the `.p8` private key file (available for download only once).
5. Place the `.p8` file at `credentials/AuthKey.p8` (or set a custom path in `.env`).

### 6. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your values:

| Variable                     | Description                                                                                           | Default                              |
| ---------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `TELEGRAM_BOT_TOKEN`         | Bot token from BotFather                                                                              | _(required)_                         |
| `TELEGRAM_CHAT_ID`           | Telegram chat ID for the bot to message                                                               | _(required)_                         |
| `OPENAI_API_KEY`             | OpenAI API key                                                                                        | _(required)_                         |
| `OPENAI_MODEL`               | OpenAI model to use                                                                                   | `gpt-5.2`                            |
| `OPENAI_REASONING_EFFORT`    | Reasoning effort for supported models: `none`, `low`, `medium`, `high`, `xhigh`. Leave empty to omit. | _(empty)_                            |
| `OPENAI_VERBOSITY`           | Verbosity for supported models: `low`, `medium`, `high`. Leave empty to omit.                         | _(empty)_                            |
| `GOOGLE_PLAY_KEY_FILE`       | Path to the Google Play service account JSON key                                                      | `./credentials/service-account.json` |
| `APP_STORE_KEY_ID`           | App Store Connect API Key ID                                                                          | _(required if using App Store)_      |
| `APP_STORE_ISSUER_ID`        | App Store Connect Issuer ID                                                                           | _(required if using App Store)_      |
| `APP_STORE_PRIVATE_KEY_FILE` | Path to the `.p8` private key file                                                                    | `./credentials/AuthKey.p8`           |
| `POLLING_INTERVAL_MINUTES`   | How often to check for new reviews (in minutes)                                                       | `30`                                 |
| `PREFERRED_LANGUAGE`         | Language for translations shown in Telegram (BCP-47 code, e.g., `en`, `uk`, `de`)                     | `en`                                 |
| `DATABASE_PATH`              | Path to the SQLite database file                                                                      | `./data/reviews.db`                  |

### 7. Configure your apps

```bash
cp config/apps.example.json config/apps.json
```

Edit `config/apps.json` to list the apps you want to monitor:

```json
[
  {
    "name": "My Android App",
    "platform": "google_play",
    "id": "com.example.myapp",
    "replyContext": "A productivity app that helps users manage tasks and reminders."
  },
  {
    "name": "My iOS App",
    "platform": "app_store",
    "id": "1234567890",
    "replyContext": "./config/my-ios-app-context.md"
  }
]
```

| Field          | Description                                                                                                                                              |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`         | Display name shown in Telegram messages.                                                                                                                 |
| `platform`     | `"google_play"`, `"app_store"`, or `"mock"`.                                                                                                             |
| `id`           | Package name for Google Play (e.g., `com.example.app`) or numeric App ID for App Store.                                                                  |
| `replyContext` | A short description of your app, or a path to a `.md`/`.txt` file with detailed guidelines. Included in the AI prompt to help generate relevant replies. |

You can list as many apps as needed. Only configure credentials for the platforms you use.

#### Mock platform

To test the bot without real store credentials, add an app with `"platform": "mock"`:

```json
{
  "name": "My Test App",
  "platform": "mock",
  "id": "com.example.testapp",
  "replyContext": "A test app for trying out the review responder bot."
}
```

The mock adapter generates 1 random review per check cycle in various languages and star ratings. Reply submission is a no-op (logged but not sent anywhere).

## Running

### Development

```bash
bun dev
```

### Production

```bash
bun start
```

## Usage

Once running, the bot will:

1. **Poll automatically** for new unresponded reviews at the configured interval.
2. **Send a Telegram message** for each new review with the review text, a translation (if applicable), and an AI-generated reply.

Each message includes two buttons:

- **Send Reply** — publishes the reply to the store.
- **Skip** — marks the review as skipped (it will not appear again).

### Commands

| Command  | Description                                        |
| -------- | -------------------------------------------------- |
| `/start` | Show welcome message and usage instructions.       |
| `/check` | Immediately check for new reviews across all apps. |
| `/help`  | Show available commands.                           |

### Adjusting replies

To modify a generated reply before sending:

1. Reply to the review message in Telegram with your feedback (e.g., "make it shorter", "mention we're working on a fix").
2. The bot regenerates the reply incorporating your comments and updates the message.
3. Repeat as needed, then tap **Send Reply**.

## Docker

### Build and run

```bash
docker build -t ai-review-responder-bot .
```

```bash
docker run -d \
  --name review-bot \
  --restart unless-stopped \
  --env-file .env \
  -v ./config:/app/config:ro \
  -v ./credentials:/app/credentials:ro \
  -v ./data:/app/data \
  ai-review-responder-bot
```

| Mount                            | Purpose                                | Mode |
| -------------------------------- | -------------------------------------- | ---- |
| `./config:/app/config`           | `apps.json` and optional context files | ro   |
| `./credentials:/app/credentials` | Service account / `.p8` key files      | ro   |
| `./data:/app/data`               | SQLite database                        | rw   |

### Docker Compose

A `docker-compose.yml` is included. It reads configuration from environment variables (or a `.env` file in the same directory).

```bash
docker compose up -d
```

### Portainer deployment

1. Push the repository to a Git remote accessible from your server.
2. In Portainer, go to **Stacks > Add stack** and select **Repository**.
3. Fill in the repository URL, branch (`refs/heads/main`), and compose path (`docker-compose.yml`).
4. Add the required environment variables under **Environment variables**:

| Variable                   | Required                |
| -------------------------- | ----------------------- |
| `TELEGRAM_BOT_TOKEN`       | Yes                     |
| `TELEGRAM_CHAT_ID`         | Yes                     |
| `OPENAI_API_KEY`           | Yes                     |
| `OPENAI_MODEL`             | No (default: `gpt-5.2`) |
| `OPENAI_REASONING_EFFORT`  | No                      |
| `OPENAI_VERBOSITY`         | No                      |
| `APP_STORE_KEY_ID`         | If using App Store      |
| `APP_STORE_ISSUER_ID`      | If using App Store      |
| `POLLING_INTERVAL_MINUTES` | No (default: `30`)      |
| `PREFERRED_LANGUAGE`       | No (default: `en`)      |

1. Ensure `config/apps.json` and `credentials/` are available on the server. Either:

- **Commit them** to a private repository, or
- **Bind mount from the host** by overriding the volume paths in the compose file to absolute paths on your server.

1. Click **Deploy the stack**.

The SQLite database is stored in a named Docker volume (`review-bot-data`) and persists across redeployments. To update after pushing new code, click **Pull and redeploy** in Portainer.

## API rate limits

| Platform           | Limit                                | Notes                          |
| ------------------ | ------------------------------------ | ------------------------------ |
| Google Play (GET)  | 200 per hour per app                 | Review listing                 |
| Google Play (POST) | 2,000 per day per app                | Reply submission               |
| App Store Connect  | Undocumented; returns 429 on overuse | Sequential requests            |
| OpenAI             | Depends on plan                      | Translation + reply per review |
| Telegram           | 1 message/sec per chat               | Throttled at 1.2s intervals    |

## Troubleshooting

**Bot does not respond to commands**

- Verify `TELEGRAM_CHAT_ID` matches the chat where you message the bot.
- Check that the bot token is correct.

**No reviews are fetched**

- Google Play only returns reviews from the last 7 days.
- Verify the service account has "Reply to reviews" permission in Google Play Console.
- For App Store, verify the API key has Customer Reviews permission.

**"App configuration file not found"**

- Copy `config/apps.example.json` to `config/apps.json` and configure your apps.

**Google Play authentication errors**

- Ensure the service account JSON file exists at the configured path.
- Ensure the Google Play Android Developer API is enabled in Google Cloud Console.

**App Store authentication errors**

- Verify `APP_STORE_KEY_ID` and `APP_STORE_ISSUER_ID` are correct.
- Ensure the `.p8` file exists at the configured path.
- The `.p8` file can only be downloaded once. If lost, generate a new key.

## License

Distributed under the [MIT](https://choosealicense.com/licenses/mit/) License.
See [LICENSE](LICENSE) for more information.
