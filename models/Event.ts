export interface Event {
    Type: string,
    Payload: any,
    correlation_id: string,
    CorrelationId?: string,
    timestamp: string
}