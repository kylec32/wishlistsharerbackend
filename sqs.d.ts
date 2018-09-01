export interface SQSEvent {
    Records: [SQSRecord]
}

export interface SQSRecord {
    body: string,
    receiptHandle: string,
    md5OfBody: string,
    eventSourceARN: string,
    awsRegion: string,
    messageId: string,
    attributes: SQSAttribute
}

export interface SQSAttribute {
    ApproximateFirstReceiveTimestamp: number,
    SenderId: number,
    ApproximateReceiveCount: number,
    SentTimestamp: number
}