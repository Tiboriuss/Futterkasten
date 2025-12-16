# Futterkasten - Home Assistant Addon

Meal planning app with AI assistant for Home Assistant.

## Requirements

- **PostgreSQL Addon**: Install and configure the "PostgreSQL" addon from the Home Assistant Add-on Store first.

## Configuration

| Option | Description |
|--------|-------------|
| `AZURE_OPENAI_API_KEY` | Your Azure OpenAI API key |
| `AZURE_OPENAI_ENDPOINT` | Your Azure OpenAI endpoint URL |

## Installation

1. Install the PostgreSQL addon from the Add-on Store
2. Start PostgreSQL and create a database named `futterkasten`
3. Add this repository to your Home Assistant Add-on Store
4. Install the Futterkasten addon
5. Configure your Azure OpenAI credentials
6. Start the addon

## Usage

Access Futterkasten through the Home Assistant sidebar (Futterkasten icon) or via Ingress.

## Features

- Weekly meal planning
- AI-powered meal suggestions
- Shopping list generation
- Ingredient management
- Dish database with tags
