import { Octokit, RestEndpointMethodTypes } from '@octokit/rest';


const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

// define a function to read the contents of a directory recursively
const readDirectoryRecursive = async (
  files: any[],
  owner: string,
  repo: string,
  path: string,
): Promise<void> => {
  // fetch the contents of the repository
  const response = await octokit.rest.repos.getContent({
    owner,
    repo,
    path,
  });

  const contents = response.data;

  // loop through the files and directories in the directory
  // @ts-ignore
  for (const item of contents) {
    if (item.type === 'file') {
      // get file content
      const fileResponse = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: item.path,
      });
      files.push({
        ...item,
        // @ts-ignore
        content: Buffer.from(fileResponse.data.content, 'base64').toString(),
      });
    } else if (item.type === 'dir') {
      // recursively read the contents of the subdirectory
      readDirectoryRecursive(files, owner, repo, item.path);
    }
  }
};