# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an ISO 9000 data pipeline project (iso9000-data-pipeline) that collects, transforms, and processes ISO 9000 standard information from multiple sources. The pipeline performs data cleansing, integration, and structuring to output data in a format suitable for use by iso9000-viewer. It includes data quality checking functionality.

## Project Status

This repository has been set up as a TypeScript project with the following components:
- Node.js v24+ with ESM modules (type: "module")
- TypeScript with strictest settings
- Vitest for testing with coverage
- Prettier for formatting (150 character line width)
- Main entry point: src/main.mts

## Development Setup

The project is now initialized with:
1. TypeScript v5.7.3 with strictest compiler options
2. Package.json with ESM configuration and Node.js v24+ requirement
3. Vitest testing framework with coverage
4. Prettier code formatting

## Available npm Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run format` - Format code with Prettier (150 character line width)
- `npm run test` - Run tests with Vitest and generate coverage report
- `npm start` - Execute the main application (src/main.mts)

## Architecture Notes

The project aims to be a data pipeline with these components:
- Data collection from multiple sources
- Data cleansing and transformation
- Data integration and structuring  
- Output formatting for iso9000-viewer consumption
- Data quality validation

When implementing, consider:
- Modular pipeline architecture for different data sources
- Configurable data transformation rules
- Robust error handling and logging
- Data validation at each pipeline stage