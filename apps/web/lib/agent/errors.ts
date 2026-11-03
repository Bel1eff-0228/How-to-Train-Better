export class AgentError extends Error {constructor(public code:string,message:string,public status=422){super(message);}}
