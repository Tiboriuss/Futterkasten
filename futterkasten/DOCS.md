# Futterkasten - Home Assistant Addon

Meal planning app with AI assistant for Home Assistant.

## Requirements

- **PostgreSQL Database**: You need a PostgreSQL database. You can use:
  - The PostgreSQL addon from the Add-on Store
  - An external PostgreSQL server

## Configuration

| Option | Description |
|--------|-------------|
| `AZURE_OPENAI_API_KEY` | Your Azure OpenAI API key |
| `AZURE_OPENAI_ENDPOINT` | Your Azure OpenAI endpoint URL |
| `POSTGRES_HOST` | PostgreSQL host (e.g., `core-mariadb` or IP) |
| `POSTGRES_PORT` | PostgreSQL port (default: 5432) |
| `POSTGRES_USER` | PostgreSQL username |
| `POSTGRES_PASSWORD` | PostgreSQL password |
| `POSTGRES_DB` | Database name (default: futterkasten) |

## Installation

1. Add this repository to your Home Assistant Add-on Store:
   - Go to Settings → Add-ons → Add-on Store
   - Click the three dots menu → Repositories
   - Add: `https://github.com/Tiboriuss/Futterkasten`

2. Install and configure a PostgreSQL database

3. Install the Futterkasten addon

4. Configure your credentials in the addon settings

5. Start the addon

## Usage

Access Futterkasten through the Home Assistant sidebar (Futterkasten icon).

## Features

- Weekly meal planning
- AI-powered meal suggestions
- Shopping list generation
- Ingredient management
- Dish database with meal type tags
