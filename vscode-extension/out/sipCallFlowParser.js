"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SipCallFlowParser = void 0;
/**
 * SIP Call Flow Parser
 * Extracts SIP messages and call flows from logs for ladder diagram visualization
 */
class SipCallFlowParser {
    /**
     * Parse SIP messages from document
     */
    static parseSipMessages(document) {
        const events = [];
        const text = document.getText();
        const lines = text.split("\n");
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Try to parse SIP message
            const sipEvent = this.parseSipLine(line, i);
            if (sipEvent) {
                events.push(sipEvent);
                continue;
            }
            // Try to parse call event
            const callEvent = this.parseCallEvent(line, i);
            if (callEvent) {
                events.push(callEvent);
                continue;
            }
            // Try to parse generic message exchange
            const messageEvent = this.parseMessageExchange(line, i);
            if (messageEvent) {
                events.push(messageEvent);
            }
        }
        return events;
    }
    /**
     * Parse SIP protocol line
     */
    static parseSipLine(line, lineNumber) {
        // Pattern 1: SIP request line (INVITE, BYE, ACK, etc.)
        // Example: "2024-01-15 10:23:45.123 [SIP] Sending INVITE from alice@domain.com to bob@domain.com"
        const requestPattern = /(?:sending|sent|transmit|tx|->|outgoing).*?(INVITE|BYE|ACK|CANCEL|REGISTER|OPTIONS|INFO|SUBSCRIBE|NOTIFY|REFER|UPDATE|PRACK|MESSAGE).*?(?:from|src).*?([^\s@]+@[^\s]+).*?(?:to|dst|dest).*?([^\s@]+@[^\s]+)/i;
        const requestMatch = line.match(requestPattern);
        if (requestMatch) {
            const method = requestMatch[1].toUpperCase();
            const from = this.cleanEndpoint(requestMatch[2]);
            const to = this.cleanEndpoint(requestMatch[3]);
            const timestamp = this.extractTimestamp(line);
            if (timestamp) {
                return {
                    timestamp,
                    line: lineNumber,
                    from,
                    to,
                    message: `SIP ${method}`,
                    method,
                    direction: "outgoing",
                };
            }
        }
        // Pattern 2: SIP response line (100, 180, 200, etc.)
        // Example: "2024-01-15 10:23:46.456 [SIP] Received 200 OK from bob@domain.com to alice@domain.com"
        const responsePattern = /(?:receiv|recv|rx|<-|incoming).*?(\d{3})\s*(\w+)?.*?(?:from|src).*?([^\s@]+@[^\s]+).*?(?:to|dst|dest).*?([^\s@]+@[^\s]+)/i;
        const responseMatch = line.match(responsePattern);
        if (responseMatch) {
            const code = parseInt(responseMatch[1]);
            const reasonPhrase = responseMatch[2] || this.getReasonPhrase(code);
            const from = this.cleanEndpoint(responseMatch[3]);
            const to = this.cleanEndpoint(responseMatch[4]);
            const timestamp = this.extractTimestamp(line);
            if (timestamp) {
                return {
                    timestamp,
                    line: lineNumber,
                    from,
                    to,
                    message: `${code} ${reasonPhrase}`,
                    responseCode: code,
                    direction: "incoming",
                };
            }
        }
        // Pattern 3: Compact SIP notation
        // Example: "10:23:45 SIP: alice@example.com -> bob@example.com: INVITE"
        const compactPattern = /SIP[:\s]+([^\s@]+@[^\s]+)\s*(?:->|→)\s*([^\s@]+@[^\s]+)[:\s]+(\w+)/i;
        const compactMatch = line.match(compactPattern);
        if (compactMatch) {
            const from = this.cleanEndpoint(compactMatch[1]);
            const to = this.cleanEndpoint(compactMatch[2]);
            const methodOrCode = compactMatch[3];
            const timestamp = this.extractTimestamp(line);
            if (timestamp) {
                // Check if it's a response code or method
                const code = parseInt(methodOrCode);
                if (!isNaN(code) && code >= 100 && code <= 699) {
                    return {
                        timestamp,
                        line: lineNumber,
                        from,
                        to,
                        message: `${code} ${this.getReasonPhrase(code)}`,
                        responseCode: code,
                        direction: "incoming",
                    };
                }
                else {
                    return {
                        timestamp,
                        line: lineNumber,
                        from,
                        to,
                        message: `SIP ${methodOrCode}`,
                        method: methodOrCode.toUpperCase(),
                        direction: "outgoing",
                    };
                }
            }
        }
        return null;
    }
    /**
     * Parse call event (non-SIP but call-related)
     */
    static parseCallEvent(line, lineNumber) {
        // Pattern: Call initiation
        // Example: "10:23:45 User alice@example.com initiated call to bob@example.com"
        const callInitPattern = /(?:user|caller|from)[:\s]+([^\s@]+@[^\s]+).*?(?:initiat|start|plac|dial|call).*?(?:to|with)[:\s]+([^\s@]+@[^\s]+)/i;
        const callInitMatch = line.match(callInitPattern);
        if (callInitMatch) {
            const from = this.cleanEndpoint(callInitMatch[1]);
            const to = this.cleanEndpoint(callInitMatch[2]);
            const timestamp = this.extractTimestamp(line);
            if (timestamp) {
                return {
                    timestamp,
                    line: lineNumber,
                    from,
                    to,
                    message: "Call Initiated",
                    method: "CALL_START",
                    direction: "outgoing",
                };
            }
        }
        // Pattern: Call termination
        const callEndPattern = /(?:call|session).*?(?:end|terminat|disconnect|hung\s*up|complet).*?(?:between|from|with)[:\s]+([^\s@]+@[^\s]+).*?(?:and|to)[:\s]+([^\s@]+@[^\s]+)/i;
        const callEndMatch = line.match(callEndPattern);
        if (callEndMatch) {
            const from = this.cleanEndpoint(callEndMatch[1]);
            const to = this.cleanEndpoint(callEndMatch[2]);
            const timestamp = this.extractTimestamp(line);
            if (timestamp) {
                return {
                    timestamp,
                    line: lineNumber,
                    from,
                    to,
                    message: "Call Ended",
                    method: "CALL_END",
                    direction: "outgoing",
                };
            }
        }
        // Pattern: Call answered
        const callAnswerPattern = /([^\s@]+@[^\s]+).*?(?:answer|accept|pick).*?(?:call|from)[:\s]+([^\s@]+@[^\s]+)/i;
        const callAnswerMatch = line.match(callAnswerPattern);
        if (callAnswerMatch) {
            const from = this.cleanEndpoint(callAnswerMatch[2]);
            const to = this.cleanEndpoint(callAnswerMatch[1]);
            const timestamp = this.extractTimestamp(line);
            if (timestamp) {
                return {
                    timestamp,
                    line: lineNumber,
                    from,
                    to,
                    message: "Call Answered",
                    method: "CALL_ANSWER",
                    direction: "incoming",
                };
            }
        }
        return null;
    }
    /**
     * Parse generic message exchange
     */
    static parseMessageExchange(line, lineNumber) {
        // Pattern: Generic message format
        // Example: "Client -> Server: REGISTER" or "Server -> Client: OK"
        const messagePattern = /([A-Za-z0-9_\-\.@]+)\s*(?:->|→|⟶|=>)\s*([A-Za-z0-9_\-\.@]+)[:\s]+(.+?)(?:\s|$)/;
        const messageMatch = line.match(messagePattern);
        if (messageMatch) {
            const from = this.cleanEndpoint(messageMatch[1]);
            const to = this.cleanEndpoint(messageMatch[2]);
            const message = messageMatch[3].trim();
            const timestamp = this.extractTimestamp(line);
            if (timestamp && from && to) {
                return {
                    timestamp,
                    line: lineNumber,
                    from,
                    to,
                    message,
                    direction: "outgoing",
                };
            }
        }
        // Pattern: Sent/Received format
        // Example: "Sent to Server: REGISTER" or "Received from Client: OK"
        const sentRecvPattern = /(?:sent|transmit|tx)\s+(?:to|toward)[:\s]+([A-Za-z0-9_\-\.@]+)[:\s]+(.+?)(?:\s|$)|(?:receiv|rx|from)\s+(?:from)?[:\s]+([A-Za-z0-9_\-\.@]+)[:\s]+(.+?)(?:\s|$)/i;
        const sentRecvMatch = line.match(sentRecvPattern);
        if (sentRecvMatch) {
            const timestamp = this.extractTimestamp(line);
            if (timestamp) {
                if (sentRecvMatch[1]) {
                    // Sent message
                    return {
                        timestamp,
                        line: lineNumber,
                        from: "Local",
                        to: this.cleanEndpoint(sentRecvMatch[1]),
                        message: sentRecvMatch[2].trim(),
                        direction: "outgoing",
                    };
                }
                else if (sentRecvMatch[3]) {
                    // Received message
                    return {
                        timestamp,
                        line: lineNumber,
                        from: this.cleanEndpoint(sentRecvMatch[3]),
                        to: "Local",
                        message: sentRecvMatch[4].trim(),
                        direction: "incoming",
                    };
                }
            }
        }
        return null;
    }
    /**
     * Extract timestamp from line
     */
    static extractTimestamp(line) {
        // Pattern 1: ISO format (2024-01-15T10:23:45.123Z or 2024-01-15 10:23:45.123)
        const isoPattern = /(\d{4}[-\/]\d{2}[-\/]\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:?\d{2})?)/;
        const isoMatch = line.match(isoPattern);
        if (isoMatch) {
            const date = new Date(isoMatch[1].replace(" ", "T"));
            if (!isNaN(date.getTime())) {
                return date;
            }
        }
        // Pattern 2: Time only (HH:MM:SS.mmm)
        const timePattern = /(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?/;
        const timeMatch = line.match(timePattern);
        if (timeMatch) {
            const now = new Date();
            now.setHours(parseInt(timeMatch[1]));
            now.setMinutes(parseInt(timeMatch[2]));
            now.setSeconds(parseInt(timeMatch[3]));
            now.setMilliseconds(timeMatch[4] ? parseInt(timeMatch[4]) : 0);
            return now;
        }
        // Pattern 3: Timestamp in milliseconds
        const timestampPattern = /\b(\d{13})\b/;
        const timestampMatch = line.match(timestampPattern);
        if (timestampMatch) {
            const date = new Date(parseInt(timestampMatch[1]));
            if (!isNaN(date.getTime())) {
                return date;
            }
        }
        return null;
    }
    /**
     * Clean endpoint string
     */
    static cleanEndpoint(endpoint) {
        // Remove common prefixes/suffixes
        let cleaned = endpoint
            .replace(/^(sip:|sips:|tel:)/i, "")
            .replace(/[;\s].*$/, "") // Remove parameters
            .trim();
        // Extract username if full URI
        const uriMatch = cleaned.match(/^([^@]+)@/);
        if (uriMatch) {
            return uriMatch[1];
        }
        // Remove port numbers
        cleaned = cleaned.replace(/:\d+$/, "");
        return cleaned || endpoint;
    }
    /**
     * Get reason phrase for SIP response code
     */
    static getReasonPhrase(code) {
        const phrases = {
            // 1xx Provisional
            100: "Trying",
            180: "Ringing",
            181: "Call Is Being Forwarded",
            182: "Queued",
            183: "Session Progress",
            // 2xx Success
            200: "OK",
            202: "Accepted",
            // 3xx Redirection
            300: "Multiple Choices",
            301: "Moved Permanently",
            302: "Moved Temporarily",
            305: "Use Proxy",
            380: "Alternative Service",
            // 4xx Client Error
            400: "Bad Request",
            401: "Unauthorized",
            402: "Payment Required",
            403: "Forbidden",
            404: "Not Found",
            405: "Method Not Allowed",
            406: "Not Acceptable",
            407: "Proxy Authentication Required",
            408: "Request Timeout",
            410: "Gone",
            413: "Request Entity Too Large",
            414: "Request-URI Too Long",
            415: "Unsupported Media Type",
            416: "Unsupported URI Scheme",
            420: "Bad Extension",
            421: "Extension Required",
            423: "Interval Too Brief",
            480: "Temporarily Unavailable",
            481: "Call/Transaction Does Not Exist",
            482: "Loop Detected",
            483: "Too Many Hops",
            484: "Address Incomplete",
            485: "Ambiguous",
            486: "Busy Here",
            487: "Request Terminated",
            488: "Not Acceptable Here",
            491: "Request Pending",
            493: "Undecipherable",
            // 5xx Server Error
            500: "Server Internal Error",
            501: "Not Implemented",
            502: "Bad Gateway",
            503: "Service Unavailable",
            504: "Server Time-out",
            505: "Version Not Supported",
            513: "Message Too Large",
            // 6xx Global Failure
            600: "Busy Everywhere",
            603: "Decline",
            604: "Does Not Exist Anywhere",
            606: "Not Acceptable",
        };
        return phrases[code] || "Unknown";
    }
    /**
     * Filter events by call ID or session
     */
    static filterByCallId(events, _callId) {
        // This would require parsing Call-ID from SIP headers
        // For now, return all events
        return events;
    }
    /**
     * Group events into call sessions
     */
    static groupIntoSessions(events) {
        const sessions = [];
        let currentSession = [];
        for (const event of events) {
            if (event.method === "INVITE" || event.method === "CALL_START") {
                // Start new session
                if (currentSession.length > 0) {
                    sessions.push(currentSession);
                }
                currentSession = [event];
            }
            else if (event.method === "BYE" || event.method === "CALL_END") {
                // End current session
                currentSession.push(event);
                sessions.push(currentSession);
                currentSession = [];
            }
            else {
                // Add to current session
                currentSession.push(event);
            }
        }
        // Add remaining session
        if (currentSession.length > 0) {
            sessions.push(currentSession);
        }
        return sessions;
    }
}
exports.SipCallFlowParser = SipCallFlowParser;
//# sourceMappingURL=sipCallFlowParser.js.map