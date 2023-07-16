import { NextApiRequest, NextApiResponse } from 'next';



import { Octokit, RestEndpointMethodTypes } from '@octokit/rest';
import NodeCache from 'node-cache';


const includedFileMatchPattern: any =
  process.env.INCLUDED_FILE_MATCH_PATTERN || '\.env.*';

const dmfTtl: Number = new Number(process.env.DMF_TTL) || 24 * 60 * 60; // cache for 24 Hours

const fileDownloadLimitSize: any = new Number(process.env.FILE_DOWNLOAD_LIMIT_SIZE) || 40000; 

const dmfCache = new NodeCache({ stdTTL: dmfTtl as number }); 

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const dmfUrl: string =
  process.env.DMF_URL ||
  'https://raw.githubusercontent.com/dmfos/dmf/main/dmfs.json';

interface Framework {
  name: string;
  dmf: string;
  extra: string[];
}

interface DMF {
  language: string;
  frameworks: Framework[];
}

export interface TLF {
  type: string;
  size: number;
  name: string;
  download_url: string;
}

export interface ContentItem {
  name: string;
  content: string;
}

export interface TlfType {
  files: string[];
  folders: string[];
}
export interface Result {
  tlf: TlfType;
  contents: ContentItem[];
}

export const fetchDMFs = async (): Promise<DMF[]> => {
  const response = await fetch(dmfUrl);
  const dmfs: DMF[] = await response.json();
  return dmfs;
};

export const fetchDMFsCached = async (): Promise<DMF[]> => {
  const cacheKey = 'dmfs';
  let dmfs = dmfCache.get<DMF[]>(cacheKey);

  if (!dmfs) {
    // console.log('Fetching dmfs...');
    dmfs = await fetchDMFs();
    dmfCache.set(cacheKey, dmfs);
  } else {
    // console.log('Cached dmfs...');
  }

  return dmfs;
};
export const fetchTLF = async (
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<TLF[]> => {
  const result = await octokit.request('GET /repos/{owner}/{repo}/contents', {
    owner,
    repo,
  });
  return result.data;
};

export const fetchFileContent = async (
  downloadUrl: string,
): Promise<string> => {
  const response = await fetch(downloadUrl);
  const content = await response.text();
  return content;
};

export const isDMF = (file: TLF, dmfs: DMF[]): boolean => {
  for (const dmf of dmfs) {
    for (const framework of dmf.frameworks) {
      if (framework.dmf === file.name) {
        return true;
      }
    }
  }
  return false;
};


function matchFiles(filename: string): boolean {
  const regex = new RegExp(includedFileMatchPattern);
  const result: boolean = regex.test(filename);
  // console.log('Matched: ', result, filename);
  return result;
}

export default async function getProjectDetail(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === 'POST') {
    const { args } = req.body;
    const owner: string = args.owner;
    const repo = args.repo;

    const dmfs = await fetchDMFsCached();

    const tlfData = await fetchTLF(octokit, owner, repo);
    const tlf: string[] = [];
    const files: string[] = [];
    const folders: string[] = [];
    const contentPromises: Promise<ContentItem>[] = [];

    tlfData.forEach((file: TLF) => {
      if (file.type === 'file') {
        files.push(file.name);
      }
      if (file.type === 'dir') {
        folders.push(file.name);
      }

      if (
        (file.type === 'file' &&
          file.size < fileDownloadLimitSize &&
          isDMF(file, dmfs)) ||
        matchFiles(file.name)
      ) {
        contentPromises.push(
          fetchFileContent(file.download_url).then((content) => ({
            name: file.name,
            content,
          })),
        );
      }
    });

    const contents = await Promise.all(contentPromises);
    const result: Result = {
      tlf: { folders: folders, files: files},
      contents,
    };

    res.status(200).json(result);
  } else {
    res.status(405).end('Method Not Allowed');
  }
}