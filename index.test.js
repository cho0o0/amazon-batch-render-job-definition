const run = require('.');
const core = require('@actions/core');
const fs = require('fs');
const tmp = require('tmp');
const { BatchClient, DescribeJobDefinitionsCommand } = require('@aws-sdk/client-batch');

jest.mock('@actions/core');
jest.mock('tmp');
jest.mock('@aws-sdk/client-batch', () => ({
    BatchClient: jest.fn().mockImplementation(() => ({
        send: jest.fn().mockResolvedValue({
            jobDefinitions: [{
                type: 'container',
                containerProperties: {
                    image: "some-other-image",
                    command: ["python", "extract_data.py", "--help"]
                }
            }]
        })
    })),
    DescribeJobDefinitionsCommand: jest.fn()
}));
jest.mock('fs', () => ({
    promises: {
        access: jest.fn()
    },
    constants: {
        O_CREATE: jest.fn()
    },
    rmdirSync: jest.fn(),
    existsSync: jest.fn(),
    writeFileSync: jest.fn()
}));

describe('Render job definition', () => {
    let mockBatchClient;

    beforeEach(() => {
        jest.clearAllMocks();
        mockBatchClient = {
            send: jest.fn().mockResolvedValue({
                jobDefinitions: [{
                    type: 'container',
                    containerProperties: {
                        image: "some-other-image",
                        command: ["python", "extract_data.py", "--help"]
                    },
                    status: 'ACTIVE',
                    revision: 1,
                    jobDefinitionArn: 'arn:aws:batch:region:account:job-definition/name:1',
                    containerOrchestrationType: 'ECS',
                }]
            })
        };
        BatchClient.mockImplementation(() => mockBatchClient);

        core.getInput = jest
            .fn()
            .mockImplementation((name) => {
                switch (name) {
                    case 'job-definition':
                        return 'job-definition.json';
                    case 'image':
                        return 'nginx:latest';
                    case 'command-to-override':
                        return '';
                    case 'job-definition-name':
                        return '';
                    default:
                        return '';
                }
            });

        process.env = Object.assign(process.env, { GITHUB_WORKSPACE: __dirname });
        process.env = Object.assign(process.env, { RUNNER_TEMP: '/home/runner/work/_temp' });

        tmp.fileSync.mockReturnValue({
            name: 'new-job-def-file-name'
        });

        fs.existsSync.mockReturnValue(true);

        jest.mock('./job-definition.json', () => ({
            type: 'container',
            containerProperties: {
                image: "some-other-image",
                command: ["python", "old-script.py"]
            }
        }), { virtual: true });
    });

    test('renders the job definition and creates a new job def file', async () => {
        await run();
        expect(tmp.fileSync).toHaveBeenNthCalledWith(1, {
            tmpdir: '/home/runner/work/_temp',
            prefix: 'job-definition-',
            postfix: '.json',
            keep: true,
            discardDescriptor: true
        });
        expect(fs.writeFileSync).toHaveBeenNthCalledWith(1, 'new-job-def-file-name',
            JSON.stringify({
                type: 'container',
                containerProperties: {
                    image: "nginx:latest",
                    command: ["python", "old-script.py"]
                }
            }, null, 2)
        );
        expect(core.setOutput).toHaveBeenNthCalledWith(1, 'job-definition', 'new-job-def-file-name');
    });

    test('renders a job definition with command override', async () => {
        core.getInput = jest
            .fn()
            .mockImplementation((name) => {
                switch (name) {
                    case 'job-definition':
                        return 'job-definition.json';
                    case 'image':
                        return 'nginx:latest';
                    case 'command-to-override':
                        return 'python -m src.main';
                    default:
                        return '';
                }
            });

        await run();

        expect(fs.writeFileSync).toHaveBeenNthCalledWith(1, 'new-job-def-file-name',
            JSON.stringify({
                type: 'container',
                containerProperties: {
                    image: "nginx:latest",
                    command: ["python", "-m", "src.main"]
                }
            }, null, 2)
        );
    });

    test('fetches and renders job definition from AWS Batch', async () => {
        core.getInput = jest
            .fn()
            .mockImplementation((name) => {
                switch (name) {
                    case 'job-definition-name':
                        return 'my-batch-job';
                    case 'image':
                        return 'nginx:latest';
                    case 'command-to-override':
                        return 'python -m src.main';
                    default:
                        return '';
                }
            });

        await run();

        expect(BatchClient).toHaveBeenCalled();
        expect(DescribeJobDefinitionsCommand).toHaveBeenCalledWith({
            jobDefinitionName: 'my-batch-job'
        });
        expect(mockBatchClient.send).toHaveBeenCalled();
        expect(fs.writeFileSync).toHaveBeenNthCalledWith(1, 'new-job-def-file-name',
            JSON.stringify({
                type: 'container',
                containerProperties: {
                    image: "nginx:latest",
                    command: ["python", "-m", "src.main"]
                }
            }, null, 2)
        );
        expect(core.info).toHaveBeenCalledWith("Task definition will be fetched from AWS Batch.");
    });

    test('handles AWS Batch API error', async () => {
        core.getInput = jest
            .fn()
            .mockImplementation((name) => {
                switch (name) {
                    case 'job-definition-name':
                        return 'my-batch-job';
                    case 'image':
                        return 'nginx:latest';
                    default:
                        return '';
                }
            });

        const error = new Error('AWS Batch API Error');
        mockBatchClient.send.mockRejectedValue(error);

        await run();

        expect(core.setFailed).toHaveBeenCalledWith('AWS Batch API Error');
    });

    test('handles empty job definitions response from AWS Batch', async () => {
        core.getInput = jest
            .fn()
            .mockImplementation((name) => {
                switch (name) {
                    case 'job-definition-name':
                        return 'my-batch-job';
                    case 'image':
                        return 'nginx:latest';
                    default:
                        return '';
                }
            });

        mockBatchClient.send.mockResolvedValue({ jobDefinitions: [] });

        await run();

        expect(core.setFailed).toHaveBeenCalledWith('No job definitions found');
    });

    test('renders a job definition at an absolute path', async () => {
        core.getInput = jest
            .fn()
            .mockImplementation((name) => {
                switch (name) {
                    case 'job-definition':
                        return '/hello/job-definition.json';
                    case 'image':
                        return 'nginx:latest';
                    case 'command-to-override':
                        return '';
                    default:
                        return '';
                }
            });

        jest.mock('/hello/job-definition.json', () => ({
            type: 'container',
            containerProperties: {
                image: "some-other-image",
                command: ["python", "old-script.py"]
            }
        }), { virtual: true });

        await run();

        expect(fs.writeFileSync).toHaveBeenNthCalledWith(1, 'new-job-def-file-name',
            JSON.stringify({
                type: 'container',
                containerProperties: {
                    image: "nginx:latest",
                    command: ["python", "old-script.py"]
                }
            }, null, 2)
        );
    });

    test('error returned for missing job definition file', async () => {
        fs.existsSync.mockReturnValue(false);
        core.getInput = jest
            .fn()
            .mockImplementation((name) => {
                switch (name) {
                    case 'job-definition':
                        return 'does-not-exist-job-definition.json';
                    case 'image':
                        return 'nginx:latest';
                    default:
                        return '';
                }
            });

        await run();

        expect(core.setFailed).toBeCalledWith('Job definition file does not exist: does-not-exist-job-definition.json');
    });

    test('error returned for job definition without container props', async () => {
        jest.mock('./missing-container-job-definition.json', () => ({
            type: 'container',
        }), { virtual: true });

        core.getInput = jest
            .fn()
            .mockImplementation((name) => {
                switch (name) {
                    case 'job-definition':
                        return 'missing-container-job-definition.json';
                    case 'image':
                        return 'nginx:latest';
                    default:
                        return '';
                }
            });

        await run();

        expect(core.setFailed).toBeCalledWith('Invalid job definition: Could not find container properties');
    });
});
