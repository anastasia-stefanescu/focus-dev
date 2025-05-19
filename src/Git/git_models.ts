export interface CommitData {
    id: string;
    title: string;
    branch: string | undefined;
    author: string;
    date: string;
}

export interface PRData {
    id: string;
    title: string;
    number: number;
    state: string;
    source: string;
    destination: string;
    author: string;
    createdAt: string;
    updatedAt: string;
    closedAt: string;
    commits: CommitData[];
}

export interface BranchData {
    name: string;
    createdAt: string;
    updatedAt: string;
    mergedAt: {[key: string]: string}; // branches in which it was merged and the date
    deletedAt: string;
    pullRequests: PRData[];
    commits: CommitData[];
}

export interface projectData {
    id: string;
    name: string;
    owner: string;
    collaborators: string[];
    createdAt: string;
    updatedAt: string;
    branches: BranchData[];
}
