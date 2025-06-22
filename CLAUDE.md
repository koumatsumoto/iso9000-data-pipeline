# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an ISO 9000 data pipeline project (iso9000-data-pipeline) that collects, transforms, and processes ISO 9000 standard information from multiple sources. The pipeline performs data cleansing, integration, and structuring to output data in a format suitable for use by iso9000-viewer. It includes data quality checking functionality.

## Project Status

This repository is in early development stage with minimal implementation. Currently contains:
- README.md with project description in Japanese
- .gitignore configured for Node.js projects
- No source code, dependencies, or build configuration yet

## Development Setup

Since the project structure is not yet established, you will need to:
1. Determine the technology stack based on requirements
2. Initialize package.json and dependencies
3. Set up build/test/lint tooling
4. Create source code structure

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