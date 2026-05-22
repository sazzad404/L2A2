export interface Issue {
    id: number;
    title: string;
    description : string;
    type:"bug" | "feature_request" ;
    status: "open" | "resolved" | "in_progress" ;
    reporter_id: number;

}

export interface IssueBody {
    title?: string;
    description?: string;
    type?: string
}