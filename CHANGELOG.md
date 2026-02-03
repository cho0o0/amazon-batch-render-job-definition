# Changelog

All notable changes to this project will be documented in this file.

## [1.2.0] - 2026-02-03

### Added
- New `exclude-tags` input to filter out specified tag keys from the rendered job definition
- Support for Node.js 24 (GitHub Actions runtime)

### Changed
- Updated Node.js runtime from 20 to 24
- Updated dependencies:
  - `@aws-sdk/client-batch`: ^3.774.0 → ^3.958.0
  - `tmp`: ^0.2.3 → ^0.2.5
  - `@vercel/ncc`: ^0.38.3 → ^0.38.4
  - `eslint`: ^9.20.1 → ^9.39.2
  - `jest`: ^29.7.0 → ^30.2.0
- Removed obsolete Smithy SDK version overrides

## [1.1.0] - 2025-03-27

### Added
- New `command-to-override` input to override the container command in the job definition
- New `job-definition-name` input to fetch job definitions directly from AWS Batch

## [1.0.0] - Initial Release

### Added
- Initial release of the Amazon Batch Render Job Definition action
- Support for inserting container image URI into job definition JSON files
- Support for both local job definition files and AWS Batch API
