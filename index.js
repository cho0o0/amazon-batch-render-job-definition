const path = require('path');
const core = require('@actions/core');
const tmp = require('tmp');
const fs = require('fs');
const { BatchClient, DescribeJobDefinitionsCommand } = require('@aws-sdk/client-batch');

async function run() {
  try {
    // Get inputs
    const imageURI = core.getInput('image', { required: true });
    const jobDefinitionName = core.getInput('job-definition-name', { required: false });
    const jobDefinitionFile = core.getInput('job-definition', { required: false });

    let jobDefContents;

    if (jobDefinitionName) {
      core.info("Task definition will be fetched from AWS Batch.");
      const fetchedJobDef = await new BatchClient().send(new DescribeJobDefinitionsCommand({
        jobDefinitionName,
      }))
      // eslint-disable-next-line no-unused-vars
      const { status: _s, revision: _r, jobDefinitionArn: _j, ...cleanedJobDef } = fetchedJobDef["jobDefinitions"][0];
      jobDefContents = cleanedJobDef;
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
