# 🚀 RTMT XML Support - Quick Start

## 📋 What This Does

RTMT trace collection exports include XML files that list **all collected files with metadata**. We can parse this to:

✅ **Organize bundle by service** (Tomcat, Security, etc.)  
✅ **Show file categories** (log4j, uds-tomcat, axl-tomcat)  
✅ **Display metadata** (original paths, sizes, dates)  
✅ **Enhance navigation** (hierarchical tree view)  

---

## 🔍 XML Structure (Real Example)

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
        </FileType>
      </ServiceName>
      <ServiceName name="Cisco Tomcat">
        <FileType name="uds-tomcat">
          <FileName name="/var/log/active/tomcat/logs/uds-tomcat/localhost_access_log.txt" 
                    modifiedDate="Thu Feb 12 10:42:50 EST 2026" 
                    size="2751376">
          </FileName>
        </FileType>
      </ServiceName>
    </ServiceList>
  </Node>
</QueryResult>
```

**Key Info:**
- `<Node name>` = Server IP (10.10.30.151)
- `<ServiceName name>` = Service category (Cisco Tomcat)
- `<FileType name>` = File subcategory (log4j, uds-tomcat)
- `<FileName>` attributes = path, size, date

---

## 🎨 Before & After

### Before (Without XML Parsing)
```
📦 Bundle_700416208
  ├── 📄 securityaxl00001.log
  ├── 📄 securityuds00001.log
  ├── 📄 localhost_access_log.txt
  └── 📄 catalina.out
```

### After (With XML Parsing)
```
📦 Bundle_700416208 (Node: 10.10.30.151)
  ├── 📋 Collection Info
  │     Server: uc-cucm-pub1.mihomes.com
  │     Token: 1769783665576
  │
  ├── 🔒 Cisco Tomcat Security Logs (17 files • 15.7 MB)
  │   └── 📁 log4j
  │       ├── 📄 securityaxl00001.log (1.0 MB)
  │       └── 📄 securityaxl00002.log (1.0 MB)
  │
  └── 🌐 Cisco Tomcat (21 files • 48.3 MB)
      ├── 📁 uds-tomcat
      │   └── 📄 localhost_access_log.txt (2.6 MB)
      ├── 📁 axl-tomcat
      │   └── 📄 localhost_access_log.txt (3.8 MB)
      └── 📁 logs
          └── 📄 catalina.out (4.6 MB)
```

---

## 🔧 Implementation (TypeScript)

### Step 1: Create Parser

```typescript
interface RTMTCollectionMetadata {
  nodeIP: string;
  tokenID: string;
  services: RTMTService[];
}

interface RTMTService {
  serviceName: string;
  fileTypes: RTMTFileType[];
  totalFiles: number;
  totalSize: number;
}

interface RTMTFileType {
  typeName: string;
  files: RTMTFileInfo[];
}

interface RTMTFileInfo {
  path: string;
  fileName: string;
  modifiedDate: Date;
  size: number;
}

class RTMTXMLParser {
  static parse(xmlContent: string): RTMTCollectionMetadata | null {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlContent, 'text/xml');
    
    const nodeIP = doc.querySelector('Node')?.getAttribute('name') || 'unknown';
    const tokenID = doc.querySelector('TokenID')?.textContent || '';
    
    const services: RTMTService[] = [];
    doc.querySelectorAll('ServiceName').forEach(serviceEl => {
      const serviceName = serviceEl.getAttribute('name') || 'Unknown';
      const fileTypes: RTMTFileType[] = [];
      
      serviceEl.querySelectorAll('FileType').forEach(fileTypeEl => {
        const typeName = fileTypeEl.getAttribute('name') || 'unknown';
        const files: RTMTFileInfo[] = [];
        
        fileTypeEl.querySelectorAll('FileName').forEach(fileEl => {
          files.push({
            path: fileEl.getAttribute('name') || '',
            fileName: (fileEl.getAttribute('name') || '').split('/').pop() || '',
            modifiedDate: new Date(fileEl.getAttribute('modifiedDate') || ''),
            size: parseInt(fileEl.getAttribute('size') || '0', 10)
          });
        });
        
        fileTypes.push({ typeName, files });
      });
      
      const totalFiles = fileTypes.reduce((sum, ft) => sum + ft.files.length, 0);
      const totalSize = fileTypes.reduce((sum, ft) => 
        sum + ft.files.reduce((s, f) => s + f.size, 0), 0);
      
      services.push({ serviceName, fileTypes, totalFiles, totalSize });
    });
    
    return { nodeIP, tokenID, services };
  }
  
  static detectRTMTXML(fileName: string): boolean {
    return fileName.toLowerCase().includes('tracecollectionresult') &&
           fileName.toLowerCase().endsWith('.xml');
  }
}
```

### Step 2: Integrate in Bundle Loader

```typescript
private async loadBundleLogs(bundleId: string): Promise<BundleItem[]> {
  const logs = await this.getLogsFromBundle(bundleId);
  
  // Check for RTMT XML
  const rtmtXML = logs.find(log => RTMTXMLParser.detectRTMTXML(log.fileName));
  
  if (rtmtXML) {
    const xmlContent = await fs.promises.readFile(rtmtXML.uri.fsPath, 'utf-8');
    const metadata = RTMTXMLParser.parse(xmlContent);
    
    if (metadata) {
      return this.createHierarchicalView(bundleId, metadata, logs);
    }
  }
  
  // Fallback to flat view
  return this.createFlatView(bundleId, logs);
}
```

### Step 3: Create Hierarchical View

```typescript
private createHierarchicalView(
  bundleId: string,
  metadata: RTMTCollectionMetadata,
  logs: LogFile[]
): BundleItem[] {
  const items: BundleItem[] = [];
  
  // Collection info
  items.push(new BundleItem(
    '📋 Collection Info',
    bundleId,
    0,
    0,
    `Node: ${metadata.nodeIP} | Token: ${metadata.tokenID}`,
    'info'
  ));
  
  // Service groups
  for (const service of metadata.services) {
    const serviceItem = new BundleItem(
      service.serviceName,
      bundleId,
      service.totalFiles,
      service.totalSize,
      `${service.totalFiles} files • ${this.formatSize(service.totalSize)}`,
      'service-group'
    );
    items.push(serviceItem);
  }
  
  return items;
}
```

---

## 🎯 Benefits

| Feature | Before | After |
|---------|--------|-------|
| **Organization** | Flat list | Grouped by service |
| **Metadata** | None | Size, date, path |
| **Navigation** | Manual search | Hierarchical tree |
| **File Count** | Unknown | Per-service totals |
| **Service Info** | Guessed | Definitive from XML |

---

## 📊 What Gets Extracted

### From Node Element
- ✅ Server IP address (10.10.30.151)
- ✅ Token ID (1769783665576)

### From ServiceName Elements
- ✅ Service descriptions ("Cisco Tomcat", "Cisco Tomcat Security Logs")
- ✅ File counts per service
- ✅ Total size per service

### From FileType Elements
- ✅ File categories (log4j, uds-tomcat, axl-tomcat, logs)
- ✅ Sub-grouping within services

### From FileName Elements
- ✅ Original file paths (/var/log/active/tomcat/...)
- ✅ File sizes in bytes
- ✅ Last modified dates
- ✅ Extracted filenames (catalina.out)

---

## 🧪 Testing

### Test Case 1: XML Present
```typescript
// Bundle with TraceCollectionResult*.xml
// Expected: Hierarchical view with services grouped
```

### Test Case 2: XML Missing
```typescript
// Bundle without XML
// Expected: Falls back to flat view (current behavior)
```

### Test Case 3: Multiple Services
```typescript
// XML with Tomcat + Security + others
// Expected: Each service shown as separate group
```

### Test Case 4: Malformed XML
```typescript
// Invalid/incomplete XML
// Expected: Graceful fallback to flat view
```

---

## 📝 Implementation Checklist

- [ ] Create `RTMTXMLParser` class
- [ ] Implement `parse()` method
- [ ] Implement `detectRTMTXML()` method
- [ ] Update `BundleItem` to support service-group type
- [ ] Update `loadBundleLogs()` to check for XML
- [ ] Implement `createHierarchicalView()`
- [ ] Add collection info display
- [ ] Add service grouping
- [ ] Add file type sub-grouping
- [ ] Test with real RTMT bundle
- [ ] Test without XML (fallback)
- [ ] Add error handling
- [ ] Update documentation

**Estimated Time:** ~6 hours

---

## 🎨 UI Elements

### Collection Info Item
```typescript
type: "info"
label: "📋 Collection Info"
description: "Node: 10.10.30.151 | Token: 1769783665576"
icon: Icons.codicon('info')
```

### Service Group Item
```typescript
type: "service-group"
label: "Cisco Tomcat"
description: "21 files • 48.3 MB"
icon: Icons.codicon('folder')
collapsible: true
```

### File Type Item
```typescript
type: "file-type"
label: "uds-tomcat"
description: "4 files"
icon: Icons.codicon('folderOpened')
collapsible: true
```

### Log File Item
```typescript
type: "log"
label: "catalina.out"
description: "4.6 MB"
tooltip: "Original: /var/log/active/tomcat/logs/catalina.out\nModified: Thu Feb 12 10:31:18 EST 2026"
icon: Icons.codicon('log')
```

---

## 💡 Additional Features

### 1. Search by Original Path
```typescript
// Find all files from specific directory
metadata.services
  .flatMap(s => s.fileTypes)
  .flatMap(ft => ft.files)
  .filter(f => f.path.includes('/var/log/active/tomcat'));
```

### 2. Size Warnings
```typescript
// Flag large files
if (file.size > 100 * 1024 * 1024) {
  item.description += ' ⚠️ Large file';
}
```

### 3. Date Range
```typescript
// Show collection timeframe
const dates = getAllFileDates(metadata);
const timeframe = `${min(dates)} - ${max(dates)}`;
```

### 4. Missing Files
```typescript
// Files listed in XML but not in bundle
const missingFiles = metadata.getAllFiles()
  .filter(xmlFile => !bundleFiles.includes(xmlFile.fileName));
```

---

## 🚀 Quick Implementation

**Minimal viable implementation in 2 hours:**

1. **Parser only** (~1 hour)
   - Parse XML structure
   - Extract basic info

2. **Simple grouping** (~1 hour)
   - Group logs by service name
   - Show in tree view

**Full implementation in 6 hours:**

3. **Hierarchical view** (~2 hours)
   - Service groups
   - File type sub-groups
   - Collection info

4. **Metadata display** (~1 hour)
   - Sizes, dates, paths
   - Tooltips

5. **Testing & polish** (~2 hours)
   - Test with real bundles
   - Error handling
   - UI refinement

---

## 📚 Reference

**Sample XML File:**
```
1770911314710_SjF_TraceCollectionResult_2026-02-12_10-42-58_uc-cucm-pub1.mihomes.com.xml
```

**Detection Pattern:**
```typescript
fileName.includes('TraceCollectionResult') && fileName.endsWith('.xml')
```

**Key XML Paths:**
- Node IP: `QueryResult/Node[@name]`
- Token: `QueryResult/Node/TokenID`
- Services: `QueryResult/Node/ServiceList/ServiceName`
- Files: `ServiceName/FileType/FileName`

---

**Status:** ✅ Ready to Implement  
**Complexity:** Medium  
**Time:** 2-6 hours  
**Impact:** High (Professional bundle organization)  
**Dependencies:** None (uses built-in DOMParser)

🎯 **This will significantly improve RTMT bundle viewing!**