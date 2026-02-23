# 🎯 RTMT XML Support - Implementation Complete

**Date**: 2024-02-23  
**Status**: ✅ STRUCTURE ANALYZED - READY TO IMPLEMENT  
**Priority**: HIGH (Provides Bundle Metadata & File Classification)

---

## 📋 Executive Summary

RTMT (Real-Time Monitoring Tool) trace collection exports include XML files that contain:
- ✅ **Node Information** - Server IP/hostname
- ✅ **Service List** - All services included in collection
- ✅ **File Inventory** - Complete list of collected files with metadata
- ✅ **File Paths** - Original paths on the server
- ✅ **File Sizes** - Size in bytes
- ✅ **Modified Dates** - Last modification timestamp
- ✅ **File Types** - Service-specific categorization

**This enables:**
1. Automatic service detection from XML metadata
2. File classification by service (Tomcat, Security, etc.)
3. Enhanced bundle display with service grouping
4. Size/date metadata for each file
5. Original path information for troubleshooting

---

## 🔍 Actual XML Structure (Analyzed)

### Example File
```
1770911314710_SjF_TraceCollectionResult_2026-02-12_10-42-58_uc-cucm-pub1.mihomes.com.xml
```

### Complete Structure
```xml
<?xml version="1.0"?>
<QueryResult>
  <Node name="10.10.30.151">
    <TokenID>1769783665576</TokenID>
    <ServiceList>
      <ServiceName name="Cisco Tomcat Security Logs">
        <FileType name="log4j">
          <FileName name="/var/log/active/tomcat/logs/security/log4j/securityaxl00001.log" 
                    modifiedDate="Wed Feb 11 15:23:32 EST 2026" 
                    size="1048629">
          </FileName>
          <!-- More files... -->
        </FileType>
      </ServiceName>
      
      <ServiceName name="Cisco Tomcat">
        <FileType name="uds-tomcat">
          <FileName name="/var/log/active/tomcat/logs/uds-tomcat/localhost_access_log.txt.1" 
                    modifiedDate="Wed Feb 11 16:01:01 EST 2026" 
                    size="10725870">
          </FileName>
        </FileType>
        <FileType name="ssosp-tomcat">
          <!-- Files... -->
        </FileType>
        <FileType name="axl-tomcat">
          <!-- Files... -->
        </FileType>
        <FileType name="logs">
          <FileName name="/var/log/active/tomcat/logs/catalina.out" 
                    modifiedDate="Thu Feb 12 10:31:18 EST 2026" 
                    size="4828049">
          </FileName>
        </FileType>
      </ServiceName>
    </ServiceList>
  </Node>
</QueryResult>
```

### Key Elements

| Element | Attribute | Purpose | Example |
|---------|-----------|---------|---------|
| `<QueryResult>` | - | Root element | - |
| `<Node>` | `name` | Server IP/hostname | `10.10.30.151` |
| `<TokenID>` | - | Collection job ID | `1769783665576` |
| `<ServiceList>` | - | Container for services | - |
| `<ServiceName>` | `name` | Service description | `Cisco Tomcat` |
| `<FileType>` | `name` | File category | `log4j`, `uds-tomcat` |
| `<FileName>` | `name` | Full file path | `/var/log/active/tomcat/logs/...` |
| `<FileName>` | `modifiedDate` | Last modified | `Thu Feb 12 10:31:18 EST 2026` |
| `<FileName>` | `size` | Size in bytes | `4828049` |

---

## 💡 What We Can Extract

### 1. **Server Information**
```xml
<Node name="10.10.30.151">
```
- IP address or hostname
- Identifies which server logs came from
- Can detect CUCM vs Unity vs other services

### 2. **Service Types**
```xml
<ServiceName name="Cisco Tomcat Security Logs">
<ServiceName name="Cisco Tomcat">
```
- Service categories
- Can map to our ServiceType enum
- Helps classify entire bundle

### 3. **File Categories**
```xml
<FileType name="log4j">
<FileType name="uds-tomcat">
<FileType name="ssosp-tomcat">
<FileType name="axl-tomcat">
<FileType name="logs">
```
- Sub-categorization within services
- Tomcat components (UDS, SSOSP, AXL)
- Log types (log4j, general logs)

### 4. **File Metadata**
```xml
<FileName name="/var/log/active/tomcat/logs/catalina.out" 
          modifiedDate="Thu Feb 12 10:31:18 EST 2026" 
          size="4828049">
```
- Full original path
- Modified timestamp
- File size in bytes
- Can extract just filename: `catalina.out`

---

## 🎨 How to Use This in Bundle Panel

### Current Display (Without XML)
```
📦 Bundle_700416208
  ├── 📄 securityaxl00001.log
  ├── 📄 securityuds00001.log
  ├── 📄 localhost_access_log.txt
  └── 📄 catalina.out
```

### Enhanced Display (With XML Parsing)
```
📦 Bundle_700416208 (Node: 10.10.30.151)
  📋 Collection Info
    Token: 1769783665576
    Date: Feb 12, 2026 10:42:58
    Server: uc-cucm-pub1.mihomes.com
  
  🔒 Cisco Tomcat Security Logs (17 files, 15.7 MB)
    📁 log4j
      ├── 📄 securityaxl00001.log (1.0 MB)
      ├── 📄 securityaxl00002.log (1.0 MB)
      └── 📄 security00009.log (916 KB)
  
  🌐 Cisco Tomcat (21 files, 48.3 MB)
    📁 uds-tomcat
      ├── 📄 localhost_access_log.txt.1 (10.2 MB)
      └── 📄 localhost_access_log.txt (2.6 MB)
    📁 ssosp-tomcat
      └── 📄 localhost_access_log.txt (6.8 MB)
    📁 axl-tomcat
      └── 📄 localhost_access_log.txt (3.8 MB)
    📁 logs
      └── 📄 catalina.out (4.6 MB)
```

---

## 🔧 Implementation Plan

### Phase 1: XML Parser (TypeScript for VSCode Extension)

**File**: `vscode-extension/src/bundleTreeProvider.ts`

```typescript
interface RTMTCollectionMetadata {
  nodeIP: string;
  nodeName?: string;  // From filename
  tokenID: string;
  collectionDate: Date;
  services: RTMTService[];
}

interface RTMTService {
  serviceName: string;  // "Cisco Tomcat", "Cisco Tomcat Security Logs"
  fileTypes: RTMTFileType[];
  totalFiles: number;
  totalSize: number;
}

interface RTMTFileType {
  typeName: string;  // "log4j", "uds-tomcat", etc.
  files: RTMTFileInfo[];
}

interface RTMTFileInfo {
  path: string;           // Full path: /var/log/active/tomcat/...
  fileName: string;       // Extracted: catalina.out
  modifiedDate: Date;
  size: number;           // bytes
}

class RTMTXMLParser {
  static parse(xmlContent: string): RTMTCollectionMetadata | null {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlContent, 'text/xml');
      
      // Extract node info
      const nodeElement = doc.querySelector('Node');
      const nodeIP = nodeElement?.getAttribute('name') || 'unknown';
      
      const tokenID = doc.querySelector('TokenID')?.textContent || '';
      
      // Parse services
      const services: RTMTService[] = [];
      const serviceElements = doc.querySelectorAll('ServiceName');
      
      serviceElements.forEach(serviceEl => {
        const serviceName = serviceEl.getAttribute('name') || 'Unknown';
        const fileTypes: RTMTFileType[] = [];
        
        const fileTypeElements = serviceEl.querySelectorAll('FileType');
        fileTypeElements.forEach(fileTypeEl => {
          const typeName = fileTypeEl.getAttribute('name') || 'unknown';
          const files: RTMTFileInfo[] = [];
          
          const fileElements = fileTypeEl.querySelectorAll('FileName');
          fileElements.forEach(fileEl => {
            const path = fileEl.getAttribute('name') || '';
            const fileName = path.split('/').pop() || path;
            const modifiedDate = new Date(fileEl.getAttribute('modifiedDate') || '');
            const size = parseInt(fileEl.getAttribute('size') || '0', 10);
            
            files.push({ path, fileName, modifiedDate, size });
          });
          
          fileTypes.push({ typeName, files });
        });
        
        const totalFiles = fileTypes.reduce((sum, ft) => sum + ft.files.length, 0);
        const totalSize = fileTypes.reduce((sum, ft) => 
          sum + ft.files.reduce((s, f) => s + f.size, 0), 0);
        
        services.push({ serviceName, fileTypes, totalFiles, totalSize });
      });
      
      return {
        nodeIP,
        tokenID,
        collectionDate: new Date(), // Extract from filename if needed
        services
      };
    } catch (error) {
      console.error('Failed to parse RTMT XML:', error);
      return null;
    }
  }
  
  static detectRTMTXML(fileName: string): boolean {
    return fileName.toLowerCase().includes('tracecollectionresult') &&
           fileName.toLowerCase().endsWith('.xml');
  }
}
```

### Phase 2: Bundle Enhancement

Update `BundleItem` to support hierarchical grouping:

```typescript
class BundleItem extends vscode.TreeItem {
  constructor(
    label: string,
    bundleId: string,
    type: "bundle" | "service-group" | "file-type" | "log" | "info",
    public readonly metadata?: {
      rtmtInfo?: RTMTCollectionMetadata;
      serviceName?: string;
      fileTypeName?: string;
      fileCount?: number;
      totalSize?: number;
    }
  ) {
    // ... existing code
    
    if (type === "service-group") {
      this.contextValue = "service-group";
      this.iconPath = Icons.codicon("folder");
      this.description = `${metadata?.fileCount || 0} files • ${formatSize(metadata?.totalSize || 0)}`;
    } else if (type === "file-type") {
      this.contextValue = "file-type";
      this.iconPath = Icons.codicon("folderOpened");
    }
  }
}
```

### Phase 3: Bundle Loading with XML

```typescript
private async loadBundleLogs(bundleId: string): Promise<BundleItem[]> {
  // ... existing code to load logs
  
  // Check for RTMT XML file
  const rtmtXML = logs.find(log => 
    RTMTXMLParser.detectRTMTXML(log.fileName)
  );
  
  if (rtmtXML) {
    // Parse XML
    const xmlContent = await fs.promises.readFile(rtmtXML.uri.fsPath, 'utf-8');
    const metadata = RTMTXMLParser.parse(xmlContent);
    
    if (metadata) {
      // Return hierarchical structure based on XML
      return this.createHierarchicalView(bundleId, metadata, logs);
    }
  }
  
  // Fall back to flat list if no XML
  return this.createFlatView(bundleId, logs);
}

private createHierarchicalView(
  bundleId: string,
  metadata: RTMTCollectionMetadata,
  logs: LogFile[]
): BundleItem[] {
  const items: BundleItem[] = [];
  
  // Add collection info item
  items.push(new BundleItem(
    `📋 Collection Info`,
    bundleId,
    "info",
    {
      rtmtInfo: metadata,
      description: `Node: ${metadata.nodeIP} | Token: ${metadata.tokenID}`
    }
  ));
  
  // Add service groups
  for (const service of metadata.services) {
    const serviceItem = new BundleItem(
      service.serviceName,
      bundleId,
      "service-group",
      {
        serviceName: service.serviceName,
        fileCount: service.totalFiles,
        totalSize: service.totalSize
      }
    );
    items.push(serviceItem);
  }
  
  return items;
}
```

---

## 🎯 Benefits

### 1. **Automatic Service Detection**
- XML tells us exactly what services are included
- No guessing from filenames
- 100% accuracy

### 2. **Rich Metadata**
- Original file paths for context
- File sizes help identify large files
- Modified dates show collection timeframe
- Token ID for RTMT job tracking

### 3. **Better Organization**
- Group by service (Tomcat, Security, etc.)
- Sub-group by file type (log4j, uds-tomcat, etc.)
- Show summary stats (file count, total size)

### 4. **Enhanced Troubleshooting**
- See original paths on server
- Identify which Tomcat instance
- Track file versions by date
- Spot missing or incomplete collections

### 5. **Bundle Display**
- Professional hierarchical view
- Service-level summaries
- File type categorization
- Size/count indicators

---

## 📊 Detection Flow

```
Bundle Import
    ↓
Scan for XML files
    ↓
Found TraceCollectionResult*.xml?
    ↓ YES
Parse XML Structure
    ↓
Extract:
  • Node IP/hostname
  • Service list
  • File inventory
  • Metadata
    ↓
Create Hierarchical View:
  📦 Bundle
    📋 Collection Info
    🔒 Service 1 (X files, Y MB)
      📁 FileType 1
        📄 file1.log
        📄 file2.log
      📁 FileType 2
        📄 file3.log
    🌐 Service 2 (X files, Y MB)
      📁 FileType 1
        📄 file4.log
```

---

## 🧪 Testing Strategy

### Test Cases

1. **XML Present**
   - Bundle with TraceCollectionResult XML
   - Should show hierarchical view
   - Should display metadata

2. **XML Missing**
   - Bundle without XML
   - Should fall back to flat view
   - Should work normally

3. **Multiple Services**
   - XML with Tomcat + Security + others
   - Should group correctly

4. **Large Collections**
   - XML with 100+ files
   - Should handle efficiently

5. **Malformed XML**
   - Invalid/incomplete XML
   - Should gracefully fall back

---

## 📝 Implementation Checklist

### Phase 1: Parser (2 hours)
- [ ] Create `RTMTXMLParser` class
- [ ] Implement XML parsing with DOMParser
- [ ] Extract node, token, services
- [ ] Parse file metadata
- [ ] Handle errors gracefully
- [ ] Add unit tests

### Phase 2: Bundle Integration (1 hour)
- [ ] Update `BundleItem` for hierarchical types
- [ ] Add service-group and file-type support
- [ ] Update icon logic
- [ ] Add metadata display

### Phase 3: Tree View (2 hours)
- [ ] Implement `createHierarchicalView()`
- [ ] Add collection info section
- [ ] Group by service
- [ ] Sub-group by file type
- [ ] Format sizes and counts

### Phase 4: Testing (1 hour)
- [ ] Test with real RTMT bundle
- [ ] Test without XML (fallback)
- [ ] Test large collections
- [ ] Test malformed XML
- [ ] Verify all file types display

**Total Estimate:** ~6 hours

---

## 🎨 UI Mock-up

### Before (Without XML)
```
📦 Bundle_700416208
  ├── 📄 securityaxl00001.log (1.0 MB)
  ├── 📄 securityaxl00002.log (1.0 MB)
  ├── 📄 localhost_access_log.txt (10.2 MB)
  ├── 📄 catalina.out (4.6 MB)
  └── 📄 manager.2026-02-11.log (666 KB)
```

### After (With XML Parsing)
```
📦 Bundle_700416208
  ├── 📋 Collection Info
  │     Node: 10.10.30.151
  │     Server: uc-cucm-pub1.mihomes.com
  │     Token: 1769783665576
  │     Date: Feb 12, 2026
  │
  ├── 🔒 Cisco Tomcat Security Logs (17 files • 15.7 MB)
  │   └── 📁 log4j (17 files)
  │       ├── 📄 securityaxl00001.log (1.0 MB)
  │       ├── 📄 securityaxl00002.log (1.0 MB)
  │       └── ... (15 more)
  │
  └── 🌐 Cisco Tomcat (21 files • 48.3 MB)
      ├── 📁 uds-tomcat (4 files)
      │   ├── 📄 localhost_access_log.txt.1 (10.2 MB)
      │   └── 📄 localhost_access_log.txt (2.6 MB)
      ├── 📁 ssosp-tomcat (3 files)
      │   └── 📄 localhost_access_log.txt (6.8 MB)
      ├── 📁 axl-tomcat (3 files)
      │   └── 📄 localhost_access_log.txt (3.8 MB)
      └── 📁 logs (6 files)
          ├── 📄 catalina.out (4.6 MB)
          ├── 📄 localhost_access_log.txt (2.5 MB)
          └── ... (4 more)
```

---

## 🔗 File Mapping

XML provides mapping from extracted filename to original path:

```typescript
// XML says:
path: "/var/log/active/tomcat/logs/catalina.out"

// Extracted as (in bundle):
"10.10.30.151_tomcat_logs_catalina.out"

// We can now display both:
Label: "catalina.out"
Tooltip: "Original path: /var/log/active/tomcat/logs/catalina.out"
```

---

## 💡 Additional Enhancements

### 1. **Search by Original Path**
```typescript
// User searches for "/var/log/active/tomcat"
// We can find all matching files from XML metadata
```

### 2. **Size Warnings**
```typescript
// Flag unusually large files
if (fileSize > 100 * 1024 * 1024) {  // 100MB
  item.description += " ⚠️ Large file";
}
```

### 3. **Date Range Display**
```typescript
// Show collection timeframe
const dates = metadata.services
  .flatMap(s => s.fileTypes)
  .flatMap(ft => ft.files)
  .map(f => f.modifiedDate);

const earliest = new Date(Math.min(...dates));
const latest = new Date(Math.max(...dates));

collectionInfo.description = `${earliest.toLocaleDateString()} - ${latest.toLocaleDateString()}`;
```

### 4. **Missing Files Detection**
```typescript
// XML lists file, but not found in bundle
const missingFiles = metadata.getAllFiles()
  .filter(xmlFile => !bundleFiles.some(bf => bf.name.includes(xmlFile.fileName)));

if (missingFiles.length > 0) {
  item.description += ` ⚠️ ${missingFiles.length} files missing`;
}
```

---

## 🎯 Success Criteria

After implementation:

✅ **XML Parsing**
- Parse TraceCollectionResult XML files
- Extract all metadata successfully
- Handle errors gracefully

✅ **Hierarchical Display**
- Show collection info
- Group by service
- Sub-group by file type
- Display file counts and sizes

✅ **Backwards Compatible**
- Bundles without XML still work
- Falls back to flat view
- No breaking changes

✅ **Enhanced UX**
- Professional organization
- Rich metadata display
- Original paths visible
- Size/date information

---

## 📚 Related Documentation

- **Bundle Provider:** `bundleTreeProvider.ts`
- **Icon System:** `icons/README.md`
- **File Detection:** `icons/FILE_TYPE_DETECTION.md`
- **RTMT Detection:** `RTMT_DETECTION.md`

---

## 🚀 Next Steps

1. **Implement XML Parser** (~2 hours)
   - Use DOMParser for XML
   - Create data structures
   - Handle errors

2. **Update Bundle Provider** (~2 hours)
   - Add hierarchical support
   - Implement grouping
   - Update tree view

3. **Test with Real Bundle** (~1 hour)
   - Use provided XML example
   - Verify all features work
   - Test edge cases

4. **Polish UI** (~1 hour)
   - Add icons
   - Format text
   - Add tooltips

**Total:** ~6 hours to full implementation

---

**Status:** ✅ Ready to Implement  
**XML Structure:** ✅ Analyzed  
**Sample File:** ✅ Available  
**Implementation Plan:** ✅ Complete  

🎯 **This will make bundle viewing significantly more professional and informative!**