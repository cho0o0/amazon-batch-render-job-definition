## Amazon Batch "Render Job Definition" Action for GitHub Actions

Inserts a container image URI into an Amazon Batch job definition JSON file, creating a new job definition file. Optionally allows overriding the container command.

**Table of Contents**

<!-- toc -->

- [Usage](#usage)
- [Inputs](#inputs)
- [Outputs](#outputs)
- [Examples](#examples)
- [License Summary](#license-summary)
- [Security Disclosures](#security-disclosures)

<!-- tocstop -->

## Usage

To insert the image URI `amazon/amazon-batch-sample:latest` as the image in the job definition file, and then register the edited task definition file to AWS batch:

```yaml
    - name: Render Amazon Batch job definition
      id: render-job-def
      uses: cho0o0/amazon-batch-render-job-definition@v1.3.0
      with:
        job-definition: job-definition.json
        # or directly provide the task definition name on AWS Batch
        # job-definition-name: task-definition-name-on-aws-batch
        image: amazon/amazon-batch-sample:latest
        # Optionally override the container command
        # command-to-override: "python -m src.main"
```

## Inputs

| Name | Description | Required | Default |
|------|-------------|----------|---------|
| `job-definition` | The path to the Batch job definition JSON file | No | - |
| `job-definition-name` | The name of the Batch job definition to update | No | - |
| `image` | The URI of the container image to insert into the Batch job definition | Yes | - |
| `command-to-override` | The command to override in the job definition (e.g. 'python -m src.main') | No | - |
| `exclude-tags` | Comma-separated list of tag keys to exclude from the rendered job definition | No | - |

## Outputs

| Name | Description |
|------|-------------|
| `job-definition` | The path to the rendered task definition file |

## Examples

### Basic Usage with Local Job Definition File

```yaml
    - name: Render Amazon Batch job definition
      id: render-job-def
      uses: cho0o0/amazon-batch-render-job-definition@v1.3.0
      with:
        job-definition: job-definition.json
        image: amazon/amazon-batch-sample:latest

    - name: Register with Amazon Batch service
      uses: jon-evergreen/amazon-batch-register-job-definition@v1
      with:
        job-definition: ${{ steps.render-job-def.outputs.job-definition }}
```

### Using AWS Batch Job Definition Name

```yaml
    - name: Render Amazon Batch job definition
      id: render-job-def
      uses: cho0o0/amazon-batch-render-job-definition@v1.3.0
      with:
        job-definition-name: my-batch-job
        image: amazon/amazon-batch-sample:latest
```

### Overriding Container Command

```yaml
    - name: Render Amazon Batch job definition
      id: render-job-def
      uses: cho0o0/amazon-batch-render-job-definition@v1.3.0
      with:
        job-definition: job-definition.json
        image: amazon/amazon-batch-sample:latest
        command-to-override: "python -m src.main"
```

### Excluding Tags from Job Definition

When fetching a job definition from AWS Batch, you may want to exclude certain tags from the rendered output. This is useful when tags like `Environment` or `CostCenter` should not be included in the new job definition.

```yaml
    - name: Render Amazon Batch job definition
      id: render-job-def
      uses: cho0o0/amazon-batch-render-job-definition@v1.3.0
      with:
        job-definition-name: my-batch-job
        image: amazon/amazon-batch-sample:latest
        exclude-tags: "Environment, CostCenter, ManagedBy"
```

## License Summary

This code is made available under the MIT license.

## Security Disclosures

If you would like to report a potential security issue in this project, please do not create a GitHub issue.
