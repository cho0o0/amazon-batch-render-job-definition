const path = require('path');
const core = require('@actions/core');
const tmp = require('tmp');
const fs = require('fs');
const unset = require('lodash.unset');

const { BatchClient, DescribeJobDefinitionsCommand } = require('@aws-sdk/client-batch');

async function run() {
  try {
    // Get inputs
    const imageURI = core.getInput('image', { required: true });
    const jobDefinitionName = core.getInput('job-definition-name', { required: false });
    const jobDefinitionFile = core.getInput('job-definition', { required: false });
    const commandToOverride = core.getInput('command-to-override', { required: false });
    const excludeTags = core.getInput('exclude-tags', { required: false });

    let jobDefContents;

    if (jobDefinitionName) {
      core.info("Task definition will be fetched from AWS Batch.");
      const fetchedJobDef = await new BatchClient().send(new DescribeJobDefinitionsCommand({
        jobDefinitionName,
      }))

      if (!fetchedJobDef.jobDefinitions || fetchedJobDef.jobDefinitions.length === 0) {
        throw new Error('No job definitions found');
      }

      jobDefContents = fetchedJobDef.jobDefinitions.sort((a, b) => b.revision - a.revision)[0];
      unset(jobDefContents, 'containerOrchestrationType');
      unset(jobDefContents, 'containerProperties.networkConfiguration.interfaceConfigurations');
      unset(jobDefContents, 'status');
      unset(jobDefContents, 'revision');
      unset(jobDefContents, 'jobDefinitionArn');

    } else {
      core.info("Task definition will be read from the local file system.");

      // Parse the task definition
      const jobDefPath = path.isAbsolute(jobDefinitionFile) ?
        jobDefinitionFile :
        path.join(process.env.GITHUB_WORKSPACE, jobDefinitionFile);
      if (!fs.existsSync(jobDefPath)) {
        throw new Error(`Job definition file does not exist: ${jobDefinitionFile}`);
      }
      jobDefContents = require(jobDefPath);
    }

    // Insert the image URI
    const containerProp = jobDefContents.containerProperties;
    if (!containerProp) {
      throw new Error('Invalid job definition: Could not find container properties');
    }
    containerProp.image = imageURI;

    // Override command if provided
    if (commandToOverride) {
      containerProp.command = commandToOverride.split(' ');
      core.info(`Command overridden with: ${commandToOverride}`);
    }

    // Exclude specified tags if provided
    if (excludeTags && jobDefContents.tags) {
      const tagsToExclude = excludeTags.split(',').map(tag => tag.trim()).filter(tag => tag);
      for (const tagKey of tagsToExclude) {
        if (jobDefContents.tags[tagKey] !== undefined) {
          delete jobDefContents.tags[tagKey];
          core.info(`Excluded tag: ${tagKey}`);
        }
      }
      // Remove empty tags object
      if (Object.keys(jobDefContents.tags).length === 0) {
        delete jobDefContents.tags;
      }
    }

    // Write out a new task definition file
    var updatedjobDefFile = tmp.fileSync({
      tmpdir: process.env.RUNNER_TEMP,
      prefix: 'job-definition-',
      postfix: '.json',
      keep: true,
      discardDescriptor: true
    });
    const newJobDefContents = JSON.stringify(jobDefContents, null, 2);
    fs.writeFileSync(updatedjobDefFile.name, newJobDefContents);
    core.setOutput('job-definition', updatedjobDefFile.name);
  }
  catch (error) {
    core.setFailed(error.message);
  }
}

module.exports = run;

/* istanbul ignore next */
if (require.main === module) {
  run();
}
