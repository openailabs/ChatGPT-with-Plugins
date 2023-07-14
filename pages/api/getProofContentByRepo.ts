import { NextApiRequest, NextApiResponse } from 'next';



import { Octokit, RestEndpointMethodTypes } from '@octokit/rest';
import { parse } from 'url';


const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

interface LangFramework {
  language: string;
  framework: {
    name: string;
    dmf: string;
    extra: string[];
  }[];
}

/**
 * @swagger
 * /api/getProofContentByRepo:
 *   post:
 *     description: Returns the hello world
 *     responses:
 *       200:
 *         description: hello world
 */
const getProofContentByRepo = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  //curl -X POST -H "Content-Type: application/json" -d '{"url": "https://github.com/angular/angular/tree/master/angular_router"}' http://localhost:3000/api/getProofContentByRepo
  const url = req.body.url;
  const parsedUrl = parse(url);
  
  const [owner, repo] = (parsedUrl.pathname?.split('/').filter(Boolean) ||
  []) as [string, string];
  console.log(owner)
  console.log(repo)

  
  try {
    const response = await fetch(
      'https://raw.githubusercontents.com/dmfos/dmf/main/dmf.json',
    );
    const langFrameworks: LangFramework[] = await response.json();

    const tlf = await octokit.repos.getContent({ owner, repo });

    let files: string[] = [];
    let folders: string[] = [];

    tlf.data.forEach(
      (
        file: RestEndpointMethodTypes['repos']['getContent']['response']['data'],
      ) => {
        if (file.type === 'file') {
          for (let lang of langFrameworks) {
            for (let framework of lang.framework) {
              if (
                (framework.dmf.includes('*') &&
                  file.name.endsWith(framework.dmf.split('*')[1])) ||
                file.name === framework.dmf
              ) {
                files.push(file.name);
              }
            }
          }
        } else if (file.type === 'dir') {
          folders.push(file.name);
        }
      },
    );

    let contents: { [key: string]: string } = {};

    await Promise.all(
      files.map(async (file: string) => {
        console.log(file)
        const content = await octokit.repos.getContent({
          owner,
          repo,
          path: `/${file}`,
        });

        if (content.data.size < 40000) {
          const buff = Buffer.from(content.data.content, 'base64');
          const text = buff.toString('utf-8');
          contents[file] = text;
        }
      }),
    );

    res.status(200).json({
      tlf: [...files, ...folders],
      contents: contents,
    });
  } catch (error: unknown) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export default getProofContentByRepo;