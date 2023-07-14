// Import the necessary packages
import { NextApiRequest, NextApiResponse } from 'next';



import { Octokit } from '@octokit/rest';


const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

const dmfUrl = 'https://raw.githubusercontent.com/dmfos/dmf/main/dmf.json';

const ignoreFiles = [
  /.*\.md$/,
  /.*\.txt$/,
  /.*\.ts$/,
  /.*\.js$/,
  /.*\.html$/,
  /LICENSE/,
  /node_modules/,
  /target/,
  /build/,
  /.*ignore/,
  /.*lock.*/,
  /prettier.*/,
  /tsconfig.*/,
  /.eslintrc.*/,
  /.git.*/,
  /.npm.*/,
  /..*rc/,
];

const getProofContentByRepo = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const { owner, repo } = req.query;

  try {
    // 1. Get top level files
    const tlf = await octokit.repos.getContent({ owner, repo });

    let files: any[] = [];
    let folders: any[] = [];


    tlf.data.forEach((file: any) => {
      if (
        file.type === 'file' &&
        !ignoreFiles.some((regex) => regex.test(file.name))
      ) {
        files.push(file.name);
      } else if (file.type === 'dir') {
        folders.push(file.name);
      }
    });

    // 2. Get file contents
    let contents: any = {};

    const fileRes = await Promise.all(
      files.map(async (file: any) => {
        const content = await octokit.repos.getContent({
          owner,
          repo,
          path: `/${file}`,
        });

        // Get file content if file size is less than 1KB
        if (content.data.size < 40000) {
          const buff = new Buffer(content.data.content, 'base64');
          const text = buff.toString('utf-8');
          contents[file] = text;
        }
      }),
    );

    // 3. Respond with a json formatted result
    res.status(200).json({
      tlf: [...files, ...folders],
      contents: contents,
    });
  } catch (error: any) {
    // Handle error
    res.status(400).json({ error: error.message });
  }
};

export default getProofContentByRepo;

// curl -X GET "http://localhost:3003/api/getProofContentByRepo?owner=sxqib&repo=ChatGPT-with-Plugins"