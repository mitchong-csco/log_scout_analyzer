import * as vscode from "vscode";

/**
 * Interface for SIP message extraction with boundary-based detection
 */
export interface BoundaryBasedSipMessage {
    service: 'jabber' | 'sdl' | 'sip-proxy';
    startBoundaryLine: string;
    endBoundaryLine: string;
    startLineNumber: number;
    endLineNumber: number;
    intermediateLines: string[];
    extractedParams: ExtractedParams;
    sipContent?: string;
}

/**
 * Interface for extracted parameters
 */
export interface ExtractedParams {
    [key: string]: string;
}

/**
 * Interface for boundary service patterns
 */
export interface BoundaryServicePattern {
    service: 'jabber' | 'sdl' | 'sip-proxy';
    startBoundaryPattern: string;
    endBoundaryPattern: string;
    parameterExtractors: ParameterExtractor[];
    description: string;
}

/**
 * Interface for parameter extractors
 */
export interface ParameterExtractor {
    name: string;
    regex: string;
}

/**
 * Enhanced SIP extraction with boundary-based multi-line detection
 * 
 * This class provides comprehensive SIP message extraction using:
 * - Service-specific boundary patterns
 * - Multi-line message capture
 * - Rich parameter extraction including SDP payloads
 * - RFC-compliant parsing
 */
export class BoundaryBasedSipExtractor {
    private patterns: Map<string, BoundaryServicePattern> = new Map();

    constructor() {
        this.initializePatterns();
    }

    /**
     * Initialize known service patterns
     * 
     * Jabber: sipio-(sent|recv)(--->|<---) to ::End-Of-Sip-Message::
     * SDL: Incoming SIP (TCP|UDP) Message to Outgoing SIP (TCP|UDP) Message
     * SIP-Proxy: Incoming SIP (TCP|UDP) Message to End-Of-Sip-Message
     */
    private initializePatterns(): void {
        // Register Jabber boundary-based SIP pattern
        this.patterns.set('jabber', {
            service: 'jabber',
            startBoundaryPattern: 'sipio-(sent|recv)(--->|<---)',
            endBoundaryPattern: '::End-Of-Sip-Message::',
            parameterExtractors: this.getJabberBoundaryExtractors(),
            description: 'Cisco Jabber boundary-based SIP debug format'
        });
        
        // Register SDL boundary-based SIP pattern
        this.patterns.set('sdl', {
            service: 'sdl',
            startBoundaryPattern: 'Incoming SIP (TCP|UDP) Message',
            endBoundaryPattern: 'Outgoing SIP (TCP|UDP) Message',
            parameterExtractors: this.getSdlBoundaryExtractors(),
            description: 'CUCM SDL boundary-based SIP debug format'
        });
        
        // Register SIP-Proxy boundary-based SIP pattern
        this.patterns.set('sip-proxy', {
            service: 'sip-proxy',
            startBoundaryPattern: 'Incoming SIP (TCP|UDP) Message',
            endBoundaryPattern: 'End-Of-Sip-Message',
            parameterExtractors: this.getSipProxyBoundaryExtractors(),
            description: 'CUCM boundary-based SIP proxy logs'
        });
    }

    /**
     * Get boundary extractors for Jabber service
     * 
     * Includes log metadata, SIP headers, and SDP extraction
     */
    private getJabberBoundaryExtractors(): ParameterExtractor[] {
        return [
            { name: 'logTimestamp', regex: '^\\d{4}-\\d{2}-\\d{2}\\s\\d{2}:\\d{2}[.,]\\d{3}\\s+(DEBUG|INFO|WARN|ERROR)' },
            { name: 'logLevel', regex: '\\[(DEBUG|INFO|WARN|ERROR)\\]' },
            { name: 'threadId', regex: '\\[0x[0-9a-fA-F]+\\]' },
            { name: 'transportDirection', regex: 'sipio-(sent|recv)' },
            { name: 'messageDirection', regex: '(--->|<---)' },
            { name: 'sipMethod', regex: '(?:<---|--->)\\s+(INVITE|BYE|ACK|CANCEL|REGISTER|OPTIONS|INFO|SUBSCRIBE|NOTIFY|REFER|UPDATE|PRACK|MESSAGE)\\s' },
            { name: 'sipVersion', regex: '(?:<---|--->)\\s+(SIP/2\\.0)\\s' },
            { name: 'sipUri', regex: '(?:<---|--->)\\s+(?:SIP/2\\.0\\s+)?(sip:[^\\s]+)' },
            { name: 'fromHeader', regex: 'From:\\s*(.+?)(?:\\r?\\n|$)' },
            { name: 'toHeader', regex: 'To:\\s*(.+?)(?:\\r?\\n|$)' },
            { name: 'callId', regex: 'Call-ID:\\s*(.+?)(?:\\r?\\n|$)' },
            { name: 'cseq', regex: 'CSeq:\\s*(.+?)(?:\\r?\\n|$)' },
            { name: 'viaHeader', regex: 'Via:\\s*(.+?)(?:\\r?\\n|$)' },
            { name: 'maxForwards', regex: 'Max-Forwards:\\s*(\\d+)(?:\\r?\\n|$)' },
            { name: 'dateHeader', regex: 'Date:\\s*(.+?)(?:\\r?\\n|$)' },
            { name: 'userAgent', regex: 'User-Agent:\\s*(.+?)(?:\\r?\\n|$)' },
            { name: 'contactHeader', regex: 'Contact:\\s*(.+?)(?:\\r?\\n|$)' },
            { name: 'supportedHeader', regex: 'Supported:\\s*(.+?)(?:\\r?\\n|$)' },
            { name: 'expiresHeader', regex: 'Expires:\\s*(\\d+)(?:\\r?\\n|$)' },
            { name: 'contentLength', regex: 'Content-Length:\\s*(\\d+)(?:\\r?\\n|$)' },
            { name: 'sdpPayload', regex: 'Content-Disposition:\\s*session.*?([\\s\\S]).*?\\s*v=0' },
            { name: 'sdpComplete', regex: 'v=0.*?(?=\\n\\n|$|\\r?\\n\\r)' },
            { name: 'sdpMediaCount', regex: 'm=(audio|video|application).*?(?=\\n|m=|$)' },
            { name: 'sdpAudioCodecs', regex: 'a=rtpmap:(\\d+)\\s+([^\\s;]+)' },
            { name: 'sdpVideoCodecs', regex: 'm=video.*?(?=\\n|m=|$)' },
            { name: 'sdpTransport', regex: 'c=IN\\s+IP4\\s+([^\\s]+)' },
            { name: 'sdpIce', regex: 'a=ice.*?(?=\\n|$)' },
            { name: 'sdpFingerprint', regex: 'a=fingerprint:([^\\s]+)' },
            { name: 'cucmStatus', regex: 'CUCM.*?:(.*)' },
            { name: 'stunStatus', regex: 'stun.*?CUCM.*?(LOST|FOUND)' }
        ];
    }

    /**
     * Get boundary extractors for SDL service
     * 
     * Includes SDL-specific patterns and CUCM status extraction
     */
    private getSdlBoundaryExtractors(): ParameterExtractor[] {
        return [
            { name: 'sdlTimestamp', regex: '^\\d{4}-\\d{2}-\\d{2}\\s\\d{2}:\\d{2}[.,]\\d{3}\\s+(DEBUG|INFO|WARN|ERROR)' },
            { name: 'sdlLogLevel', regex: '\\[(DEBUG|INFO|WARN|ERROR)\\]' },
            { name: 'sdlThreadId', regex: '\\[0x[0-9a-fA-F]+\\]' },
            { name: 'sdlDirection', regex: '(Incoming|Outgoing)\\s+SIP\\s+(TCP|UDP)\\s+Message' },
            { name: 'sdlTransport', regex: 'SIP\\s+(TCP|UDP)' },
            { name: 'sipMethod', regex: '(?:Incoming|Outgoing).*?\\s+(INVITE|BYE|ACK|CANCEL|REGISTER|OPTIONS|INFO|SUBSCRIBE|NOTIFY|REFER|UPDATE|PRACK|MESSAGE)' },
            { name: 'sipVersion', regex: 'SIP/2\\.0' },
            { name: 'fromHeader', regex: 'From:\\s*(.+?)(?:\\r?\\n|$)' },
            { name: 'toHeader', regex: 'To:\\s*(.+?)(?:\\r?\\n|$)' },
            { name: 'callId', regex: 'Call-ID:\\s*(.+?)(?:\\r?\\n|$)' },
            { name: 'cseq', regex: 'CSeq:\\s*(.+?)(?:\\r?\\n|$)' },
            { name: 'viaHeader', regex: 'Via:\\s*(.+?)(?:\\r?\\n|$)' },
            { name: 'maxForwards', regex: 'Max-Forwards:\\s*(\\d+)(?:\\r?\\n|$)' },
            { name: 'dateHeader', regex: 'Date:\\s*(.+?)(?:\\r?\\n|$)' },
            { name: 'userAgent', regex: 'User-Agent:\\s*(.+?)(?:\\r?\\n|$)' },
            { name: 'contactHeader', regex: 'Contact:\\s*(.+?)(?:\\r?\\n|$)' },
            { name: 'supportedHeader', regex: 'Supported:\\s*(.+?)(?:\\r?\\n|$)' },
            { name: 'expiresHeader', regex: 'Expires:\\s*(\\d+)(?:\\r?\\n|$)' },
            { name: 'contentLength', regex: 'Content-Length:\\s*(\\d+)(?:\\r?\\n|$)' },
            { name: 'sdpPayload', regex: 'Content-Disposition:\\s*session.*?([\\s\\S]).*?\\s*v=0' },
            { name: 'sdpComplete', regex: 'v=0.*?(?=\\n\\n|$|\\r?\\n\\r)' },
            { name: 'sdpMediaCount', regex: 'm=(audio|video|application).*?(?=\\n|m=|$)' },
            { name: 'sdpAudioCodecs', regex: 'a=rtpmap:(\\d+)\\s+([^\\s;]+)' },
            { name: 'sdpVideoCodecs', regex: 'm=video.*?(?=\\n|m=|$)' },
            { name: 'sdpTransport', regex: 'c=IN\\s+IP4\\s+([^\\s]+)' },
            { name: 'sdpIce', regex: 'a=ice.*?(?=\\n|$)' },
            { name: 'sdpFingerprint', regex: 'a=fingerprint:([^\\s]+)' },
            { name: 'cucmStatus', regex: 'CUCM.*?:(.*)' },
            { name: 'stunStatus', regex: 'stun.*?CUCM.*?(LOST|FOUND)' }
        ];
    }

    /**
     * Get boundary extractors for SIP-Proxy service
     * 
     * Includes SIP proxy patterns and CUCM-specific headers
     */
    private getSipProxyBoundaryExtractors(): ParameterExtractor[] {
        return [
            { name: 'logTimestamp', regex: '^\\d{4}-\\d{2}-\\d{2}\\s\\d{2}:\\d{2}[.,]\\d{3}\\s+(DEBUG|INFO|WARN|ERROR)' },
            { name: 'logLevel', regex: '\\[(DEBUG|INFO|WARN|ERROR)\\]' },
            { name: 'threadId', regex: '\\[0x[0-9a-fA-F]+\\]' },
            { name: 'transportDirection', regex: 'sipio-(sent|recv)' },
            { name: 'messageDirection', regex: '(--->|<---)' },
            { name: 'sipMethod', regex: '(?:<---|--->)\\s+(INVITE|BYE|ACK|CANCEL|REGISTER|OPTIONS|INFO|SUBSCRIBE|NOTIFY|REFER|UPDATE|PRACK|MESSAGE)\\s' },
            { name: 'sipVersion', regex: '(?:<---|--->)\\s+(SIP/2\\.0)\\s' },
            { name: 'sipUri', regex: '(?:<---|--->)\\s+(?:SIP/2\\.0\\s+)?(sip:[^\\s]+)' },
            { name: 'fromHeader', regex: 'From:\\s*(.+?)(?:\\r?\\n|$)' },
            { name: 'toHeader', regex: 'To:\\s*(.+?)(?:\\r?\\n|$)' },
            { name: 'callId', regex: 'Call-ID:\\s*(.+?)(?:\\r?\\n|$)' },
            { name: 'cseq', regex: 'CSeq:\\s*(.+?)(?:\\r?\\n|$)' },
            { name: 'viaHeader', regex: 'Via:\\s*(.+?)(?:\\r?\\n|$)' },
            { name: 'maxForwards', regex: 'Max-Forwards:\\s*(\\d+)(?:\\r?\\n|$)' },
            { name: 'dateHeader', regex: 'Date:\\s*(.+?)(?:\\r?\\n|$)' },
            { name: 'userAgent', regex: 'User-Agent:\\s*(.+?)(?:\\r?\\n|$)' },
            { name: 'contactHeader', regex: 'Contact:\\s*(.+?)(?:\\r?\\n|$)' },
            { name: 'supportedHeader', regex: 'Supported:\\s*(.+?)(?:\\r?\\n|$)' },
            { name: 'expiresHeader', regex: 'Expires:\\s*(\\d+)(?:\\r?\\n|$)' },
            { name: 'contentLength', regex: 'Content-Length:\\s*(\\d+)(?:\\r?\\n|$)' },
            { name: 'sdpPayload', regex: 'Content-Disposition:\\s*session.*?([\\s\\S]).*?\\s*v=0' },
            { name: 'sdpComplete', regex: 'v=0.*?(?=\\n\\n|$|\\r?\\n\\r)' },
            { name: 'sdpMediaCount', regex: 'm=(audio|video|application).*?(?=\\n|m=|$)' },
            { name: 'sdpAudioCodecs', regex: 'a=rtpmap:(\\d+)\\s+([^\\s;]+)' },
            { name: 'sdpVideoCodecs', regex: 'm=video.*?(?=\\n|m=|$)' },
            { name: 'sdpTransport', regex: 'c=IN\\s+IP4\\s+([^\\s]+)' },
            { name: 'sdpIce', regex: 'a=ice.*?(?=\\n|$)' },
            { name: 'sdpFingerprint', regex: 'a=fingerprint:([^\\s]+)' }
        ];
    }

    /**
     * Extract clean SIP content from intermediate lines
     */
    private extractCleanSipContent(lines: string[], service: 'jabber' | 'sdl' | 'sip-proxy'): string {
        const cleanLines: string[] = [];
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            // Handle SDL format where SIP content is mixed with boundary line
            if (service === 'sdl') {
                // Extract SIP content from SDL boundary lines like "[INCOMING] 157 Unknown"
                const sipMatch = trimmed.match(/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}[.,]\d{3}\s+\[INCOMING\]\s+\d+\s+\w+\s+(.+)$/);
                if (sipMatch) {
                    // Extract everything after the SDL prefix
                    const sipContent = sipMatch[1].trim();
                    if (sipContent && !sipContent.startsWith('[')) {
                        cleanLines.push(sipContent);
                    }
                }
                
                // Also check for plain SIP headers in SDL lines
                const cleanSipLine = trimmed.replace(/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}[.,]\d{3}\s+\[INCOMING\]\s+\d+\s+\w+\s+/, '');
                if (cleanSipLine && cleanSipLine.trim() !== '') {
                    cleanLines.push(cleanSipLine.trim());
                }
                continue;
            }
            
            // Skip Jabber metadata lines
            if (service === 'jabber') {
                if (trimmed.includes('sipio-') || trimmed.includes('::End-Of-Sip-Message::')) {
                    continue;
                }
            }
            
            // Skip SIP-Proxy metadata lines  
            if (service === 'sip-proxy') {
                if (trimmed.includes('Incoming SIP') || trimmed.includes('End-Of-Sip-Message')) {
                    continue;
                }
            }
            
            // Add the line if it looks like SIP content
            if (trimmed && 
                (trimmed.startsWith('Via:') || 
                 trimmed.startsWith('From:') || 
                 trimmed.startsWith('To:') || 
                 trimmed.startsWith('Call-ID:') || 
                 trimmed.startsWith('CSeq:') || 
                 trimmed.startsWith('Content-Length:') ||
                 trimmed.startsWith('Contact:') ||
                 trimmed.startsWith('User-Agent:') ||
                 trimmed.startsWith('Max-Forwards:') ||
                 trimmed.startsWith('Content-Type:') ||
                 trimmed.startsWith('SIP/2.0') ||
                 trimmed.match(/^(INVITE|BYE|ACK|CANCEL|REGISTER|OPTIONS|INFO|SUBSCRIBE|NOTIFY|REFER|UPDATE|PRACK|MESSAGE)\s+/))) {
                cleanLines.push(trimmed);
            }
        }
        
        const result = cleanLines.join('\n');
        console.log(`[DEBUG] Extracted SIP content for ${service}:`, result);
        return result;
    }

    /**
     * Extract parameters from log content using configured extractors
     * 
     * @param text - Log content to extract from
     * @param extractors - Array of parameter extractors
     * @returns Map of parameter names to extracted values
     */
    private extractParameters(text: string, extractors: ParameterExtractor[]): ExtractedParams {
        const extracted: ExtractedParams = {};
        
        for (const extractor of extractors) {
            const match = text.match(new RegExp(extractor.regex, 'gi'));
            if (match) {
                extracted[extractor.name] = match[1] || match[0];
            }
        }
        return extracted;
    }

    /**
     * Extract boundary-based SIP messages from document
     * 
     * @param document - VS Code document to analyze
     * @param service - Service type for boundary detection
     * @returns Array of complete SIP messages with full context
     */
    public extractBoundaryBasedMessages(
        document: vscode.TextDocument,
        service: 'jabber' | 'sdl' | 'sip-proxy'
    ): BoundaryBasedSipMessage[] {
        const pattern = this.patterns.get(service);
        if (!pattern) return [];
        
        const messages: BoundaryBasedSipMessage[] = [];
        const text = document.getText();
        const lines = text.split('\n');
        
        let currentMessage: Partial<BoundaryBasedSipMessage> | null = null;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Check for start boundary
            if (new RegExp(pattern.startBoundaryPattern).test(line)) {
                currentMessage = {
                    service,
                    startBoundaryLine: line,
                    startLineNumber: i,
                    intermediateLines: [],
                    extractedParams: {}
                };
            }
            
            // Check for end boundary
            if (currentMessage && new RegExp(pattern.endBoundaryPattern).test(line)) {
                currentMessage.endBoundaryLine = line;
                currentMessage.endLineNumber = i;
                
                // Extract clean SIP content from intermediate lines
                const sipContent = this.extractCleanSipContent(currentMessage.intermediateLines || [], service);
                currentMessage.sipContent = sipContent;
                
                // Extract parameters from complete message
                const messageText = [currentMessage.startBoundaryLine, ...(currentMessage.intermediateLines || []), currentMessage.endBoundaryLine].join('\n');
                currentMessage.extractedParams = this.extractParameters(messageText, pattern.parameterExtractors);
                
                messages.push(currentMessage as BoundaryBasedSipMessage);
                currentMessage = null;
            } else if (currentMessage && currentMessage.intermediateLines) {
                // Add intermediate lines
                currentMessage.intermediateLines.push(line);
            }
        }

        return messages;
    }

    /**
     * Get extractors for a specific service
     */
    public getExtractors(service: 'jabber' | 'sdl' | 'sip-proxy'): ParameterExtractor[] {
        const pattern = this.patterns.get(service);
        return pattern ? pattern.parameterExtractors : [];
    }

    /**
     * Get available services
     */
    public getAvailableServices(): string[] {
        return Array.from(this.patterns.keys());
    }

    /**
     * Check if a line matches a service boundary
     */
    public isBoundaryLine(line: string, service: 'jabber' | 'sdl' | 'sip-proxy'): boolean {
        const pattern = this.patterns.get(service);
        if (!pattern) return false;
        
        return new RegExp(pattern.startBoundaryPattern).test(line) || 
               new RegExp(pattern.endBoundaryPattern).test(line);
    }
}

// Legacy SipCallFlowParser class for backward compatibility
export class SipCallFlowParser {
    private static boundaryExtractor = new BoundaryBasedSipExtractor();

    /**
     * Extract SIP messages using enhanced boundary-based detection
     */
    public static extractSipMessages(document: vscode.TextDocument): any[] {
        // Try to auto-detect service type
        const text = document.getText();
        
        console.log(`[DEBUG] SIP Extraction - Document length: ${text.length}`);
        console.log(`[DEBUG] SIP Extraction - Contains 'sipio-': ${text.includes('sipio-')}`);
        console.log(`[DEBUG] SIP Extraction - Contains '::End-Of-Sip-Message::': ${text.includes('::End-Of-Sip-Message::')}`);
        console.log(`[DEBUG] SIP Extraction - Contains 'Incoming SIP': ${text.includes('Incoming SIP')}`);
        console.log(`[DEBUG] SIP Extraction - Contains 'Outgoing SIP': ${text.includes('Outgoing SIP')}`);
        console.log(`[DEBUG] SIP Extraction - Contains 'End-Of-Sip-Message': ${text.includes('End-Of-Sip-Message')}`);
        
        // Check for Jabber patterns
        if (text.includes('sipio-') && text.includes('::End-Of-Sip-Message::')) {
            console.log('[DEBUG] SIP Extraction - Detected Jabber format');
            return this.boundaryExtractor.extractBoundaryBasedMessages(document, 'jabber');
        }
        
        // Check for SDL patterns (more lenient - just need Incoming SIP)
        if (text.includes('Incoming SIP')) {
            console.log('[DEBUG] SIP Extraction - Detected SDL format');
            return this.boundaryExtractor.extractBoundaryBasedMessages(document, 'sdl');
        }
        
        // Check for SIP-Proxy patterns
        if (text.includes('Incoming SIP') && text.includes('End-Of-Sip-Message')) {
            console.log('[DEBUG] SIP Extraction - Detected SIP-Proxy format');
            return this.boundaryExtractor.extractBoundaryBasedMessages(document, 'sip-proxy');
        }
        
        // Fallback to Jabber
        console.log('[DEBUG] SIP Extraction - Fallback to Jabber format');
        return this.boundaryExtractor.extractBoundaryBasedMessages(document, 'jabber');
    }

    /**
     * Generate raw SIP file content from extracted messages (original boundary lines)
     */
    public static generateRawSipFile(messages: any[]): string {
        if (!messages || messages.length === 0) {
            return '// No SIP messages found\n';
        }

        let content = '';
        content += '// Raw SIP Messages Extracted by Log Scout Analyzer\n';
        content += `// Generated: ${new Date().toISOString()}\n`;
        content += `// Total Messages: ${messages.length}\n`;
        content += '// ======================================\n\n';

        for (let i = 0; i < messages.length; i++) {
            const message = messages[i];
            content += `// Message ${i + 1} - ${message.service || 'unknown'}\n`;
            
            // Output raw boundary lines and intermediate content exactly as found
            if (message.startBoundaryLine) {
                content += message.startBoundaryLine + '\n';
            }
            
            if (message.intermediateLines && message.intermediateLines.length > 0) {
                for (const intermediateLine of message.intermediateLines) {
                    content += intermediateLine + '\n';
                }
            }
            
            if (message.endBoundaryLine) {
                content += message.endBoundaryLine + '\n';
            }
            
            content += '\n';
            
            // Add extracted parameters as comments
            if (message.extractedParams && Object.keys(message.extractedParams).length > 0) {
                content += '// Extracted Parameters:\n';
                for (const [key, value] of Object.entries(message.extractedParams)) {
                    content += `// ${key}: ${value}\n`;
                }
                content += '\n';
            }
            
            content += '// ======================================\n\n';
        }

        return content;
    }

    /**
     * Generate SIP ladder diagram from extracted messages
     */
    public static generateLadderDiagram(messages: any[]): string {
        if (!messages || messages.length === 0) {
            return '// No SIP messages found for ladder diagram\n';
        }

        let content = '';
        content += '// SIP Ladder Diagram\n';
        content += `// Generated: ${new Date().toISOString()}\n`;
        content += `// Messages: ${messages.length}\n`;
        content += '// ======================================\n\n';

        // Group messages by call flow
        const callFlows = this.groupMessagesByCall(messages);
        
        for (const [callId, flowMessages] of Object.entries(callFlows)) {
            content += `// Call Flow: ${callId}\n`;
            content += '// ======================================\n';
            
            // Extract unique participants
            const participants = this.extractParticipants(flowMessages);
            
            // Create header
            content += '     ';
            for (const participant of participants) {
                content += `| ${participant} `;
            }
            content += '\n';
            content += '-----';
            for (let i = 0; i < participants.length; i++) {
                content += '--------';
            }
            content += '\n';
            
            // Add each message to the ladder
            for (const message of flowMessages) {
                const from = this.extractParticipant(message, 'from');
                const to = this.extractParticipant(message, 'to');
                const method = this.extractMethod(message);
                const timestamp = this.extractTimestamp(message);
                
                const fromIndex = participants.indexOf(from);
                const toIndex = participants.indexOf(to);
                
                // Create message line
                content += '     |';
                for (let i = 0; i < participants.length; i++) {
                    if (i === fromIndex) {
                        content += `--- ${method} -->`;
                    } else if (i === toIndex) {
                        content += `<-- ${method} ---`;
                    } else {
                        content += '               ';
                    }
                    content += '|';
                }
                content += '\n';
                
                // Add timestamp
                if (timestamp) {
                    content += `     | ${timestamp}\n`;
                }
                content += '     |';
                for (let i = 0; i < participants.length; i++) {
                    if (i === fromIndex || i === toIndex) {
                        content += '---------------';
                    } else {
                        content += '               ';
                    }
                    content += '|';
                }
                content += '\n\n';
            }
            
            content += '\n';
        }

        return content;
    }

    /**
     * Group messages by Call-ID for ladder diagram
     */
    private static groupMessagesByCall(messages: any[]): Record<string, any[]> {
        const callGroups: Record<string, any[]> = {};
        
        for (const message of messages) {
            const callId = this.extractCallId(message);
            if (callId) {
                if (!callGroups[callId]) {
                    callGroups[callId] = [];
                }
                callGroups[callId].push(message);
            }
        }
        
        return callGroups;
    }

    /**
     * Extract unique participants from messages
     */
    private static extractParticipants(messages: any[]): string[] {
        const participants = new Set<string>();
        
        for (const message of messages) {
            const from = this.extractParticipant(message, 'from');
            const to = this.extractParticipant(message, 'to');
            if (from) participants.add(from);
            if (to) participants.add(to);
        }
        
        return Array.from(participants);
    }

    /**
     * Extract participant from message
     */
    private static extractParticipant(message: any, type: 'from' | 'to'): string {
        // Try extracted params first
        if (message.extractedParams) {
            const fromHeader = message.extractedParams.fromHeader;
            const toHeader = message.extractedParams.toHeader;
            
            if (type === 'from' && fromHeader) {
                // Extract URI from From header
                const match = fromHeader.match(/sip:([^;@\s]+)/);
                return match ? match[1] : fromHeader;
            }
            
            if (type === 'to' && toHeader) {
                // Extract URI from To header
                const match = toHeader.match(/sip:([^;@\s]+)/);
                return match ? match[1] : toHeader;
            }
        }
        
        // Fallback to service-based extraction
        if (message.service === 'jabber') {
            const lines = message.intermediateLines || [];
            for (const line of lines) {
                if (line.includes('From:')) {
                    const match = line.match(/entity="([^"]+)"/);
                    return match ? match[1] : 'Unknown';
                }
                if (line.includes('To:')) {
                    const match = line.match(/="([^"]+)"/);
                    return match ? match[1] : 'Unknown';
                }
            }
        }
        
        return type === 'from' ? 'Unknown' : 'Unknown';
    }

    /**
     * Extract SIP method from message
     */
    private static extractMethod(message: any): string {
        if (message.extractedParams && message.extractedParams.sipMethod) {
            return message.extractedParams.sipMethod;
        }
        
        // Fallback to parsing intermediate lines
        const lines = message.intermediateLines || [];
        for (const line of lines) {
            const match = line.match(/\b(INVITE|BYE|ACK|CANCEL|REGISTER|OPTIONS|INFO|SUBSCRIBE|NOTIFY|REFER|UPDATE|PRACK|MESSAGE)\b/);
            if (match) {
                return match[1];
            }
        }
        
        return 'UNKNOWN';
    }

    /**
     * Extract Call-ID from message
     */
    private static extractCallId(message: any): string {
        // First try extracted params
        if (message.extractedParams && message.extractedParams.callId) {
            console.log(`[DEBUG] Found extracted Call-ID: ${message.extractedParams.callId}`);
            return message.extractedParams.callId;
        }
        
        // Fallback: parse from clean SIP content
        if (message.sipContent) {
            const callIdMatch = message.sipContent.match(/Call-ID:\s*([^\r\n]+)/i);
            if (callIdMatch) {
                const callId = callIdMatch[1].trim();
                console.log(`[DEBUG] Extracted Call-ID from SIP content: ${callId}`);
                return callId;
            }
        }
        
        // Fallback: parse from intermediate lines
        const lines = message.intermediateLines || [];
        for (const line of lines) {
            const match = line.match(/Call-ID:\s*([^\r\n]+)/i);
            if (match) {
                const callId = match[1].trim();
                console.log(`[DEBUG] Extracted Call-ID from intermediate lines: ${callId}`);
                return callId;
            }
        }
        
        console.log(`[DEBUG] No Call-ID found, returning 'unknown-call'`);
        return 'unknown-call';
    }

    /**
     * Extract timestamp from message
     */
    private static extractTimestamp(message: any): string {
        if (message.extractedParams && message.extractedParams.logTimestamp) {
            return message.extractedParams.logTimestamp;
        }
        
        // Try to extract from start boundary line
        if (message.startBoundaryLine) {
            const match = message.startBoundaryLine.match(/\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/);
            return match ? match[0] : '';
        }
        
        return '';
    }

    /**
     * Generate SIP file content from extracted messages
     */
    public static generateSipFile(messages: any[]): string {
        if (!messages || messages.length === 0) {
            return '// No SIP messages found\n';
        }

        let content = '';
        content += '// SIP Messages Extracted by Log Scout Analyzer\n';
        content += `// Generated: ${new Date().toISOString()}\n`;
        content += `// Total Messages: ${messages.length}\n`;
        content += '// ======================================\n\n';

        for (let i = 0; i < messages.length; i++) {
            const message = messages[i];
            content += `// Message ${i + 1} - ${message.service || 'unknown'}\n`;
            
            // Use clean SIP content if available, otherwise fall back to raw
            if (message.sipContent) {
                content += message.sipContent + '\n';
            } else {
                // Fallback to original boundary-based output
                if (message.startBoundaryLine) {
                    content += message.startBoundaryLine + '\n';
                }
                
                if (message.intermediateLines && message.intermediateLines.length > 0) {
                    // Add all intermediate lines to preserve complete message
                    for (const intermediateLine of message.intermediateLines) {
                        content += intermediateLine + '\n';
                    }
                }
                
                if (message.endBoundaryLine) {
                    content += message.endBoundaryLine + '\n';
                }
            }
            
            content += '\n';
            
            // Add extracted parameters as comments
            if (message.extractedParams && Object.keys(message.extractedParams).length > 0) {
                content += '// Extracted Parameters:\n';
                for (const [key, value] of Object.entries(message.extractedParams)) {
                    content += `// ${key}: ${value}\n`;
                }
                content += '\n';
            }
            
            content += '// ======================================\n\n';
        }

        return content;
    }
}
