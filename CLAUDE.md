# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EPITA S4 Semester Project 03 — a local LLM chat application. The reference implementation is at https://github.com/thomasbroussard/llm-integration.

The project instructions are in `docs/Project-03.pdf` and LLM alternatives are documented in `docs/llm-alternatives.pdf`.

## Tech Stack

- **Language**: Python 3
- **LLM API**: chosen per developer preference (see `docs/llm-alternatives.pdf` for options)

## Architecture

The application follows a streaming chat architecture. Specific frameworks and structure are to be determined, but the core flow is:

1. User sends a message via the frontend
2. Backend forwards the message to the chosen LLM API with conversation history
3. Streamed response tokens are sent back to the client in real time
4. Conversation history is maintained manually as a list of `{"role": ..., "content": ...}` dicts across turns

## Commands

To be added once the project structure is established (e.g., `pip install -r requirements.txt`, how to run the server).
