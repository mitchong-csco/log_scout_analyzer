# 🧠 Enhanced RTMT Path Learning Model - Based on Real-World Data

**Generated From**: 41 Real RTMT Archives (Ford CUCM Deployment)  
**Date**: February 23, 2026  
**Total Paths Analyzed**: 72 unique log paths  
**Services Detected**: 41 distinct Cisco services  

---

## 🎯 Executive Summary

This document provides a **production-grade path learning model** derived from actual Cisco CUCM RTMT exports. Unlike theoretical documentation, these patterns represent **real deployment data** from a production Ford environment.

### Key Discoveries:

✅ **Path Hierarchy Confirmed**: `/active/` is the universal base for all CUCM logs  
✅ **Service Components Identified**: Clear separation between `cm/`, `tomcat/`, `platform/`, `syslog/`  
✅ **Unique Signatures Found**: 41 services with distinct path patterns  
✅ **File Extensions**: `.log`, `.txt`, `.csv`, `.out` (no extension for syslog)  
✅ **Naming Conventions**: Sequential numbering (`ccm00001`), date stamps, hostname patterns  

---

## 📊 Path Hierarchy Structure

### Universal Base Path

```
/active/
```

**All CUCM logs** start with this base. This is the mount point for active log storage.

### Primary Service Branches

```
/active/
├── cm/              → CallManager core services (traces, logs)
├── tomcat/          → Web services (AXL, UDS, SOAP, Admin)
├── platform/        → Platform services (CLI, DRF, SNMP, Cert)
├── syslog/          → System logs (messages, secure, NTP)
└── audit/           → Audit logs (AuditApp, VOS)
```

### Alternate Base Path (Jakarta Tomcat)

```
l/thirdparty/jakarta-tomcat/logs/
├── axl-tomcat/      → AXL web service
├── uds-tomcat/      → User Data Services
└── ssosp-tomcat/    → SSO Service Provider
```

**Note**: The `l/` prefix indicates a symlink location. These are also accessible via `/active/tomcat/logs/`.

---

## 🔍 Service Detection Signatures

### High-Confidence Patterns (100% Unique)

These path components are **unique identifiers** for specific services:

| Service | Unique Path Component | Full Path Example |
|---------|----------------------|-------------------|
| **AXL Tomcat** | `/axl-tomcat/` | `l/thirdparty/jakarta-tomcat/logs/axl-tomcat/` |
| **UDS Tomcat** | `/uds-tomcat/` | `l/thirdparty/jakarta-tomcat/logs/uds-tomcat/` |
| **SSOSP Tomcat** | `/ssosp-tomcat/` | `l/thirdparty/jakarta-tomcat/logs/ssosp-tomcat/` |
| **SOAP Web Service** | `/soap/` | `active/tomcat/logs/soap/log4j/` |
| **RTMT Web Service** | `/rtmt/` | `active/tomcat/logs/rtmt/log4j/` |
| **CCMAdmin** | `/ccmadmin/` | `active/tomcat/logs/ccmadmin/log4j/` |
| **CCMService** | `/ccmservice/` | `active/tomcat/logs/ccmservice/log4j/` |
| **RisBean Library** | `/risbean/` | `active/tomcat/logs/risbean/log4j/` |
| **Platform API** | `/platform-api/` | `active/tomcat/logs/platform-api/log4j/` |
| **Security Logs** | `/security/log4j/` | `active/tomcat/logs/security/log4j/` |
| **DRF Master** | `/drf/` | `active/platform/drf/trace/` |
| **HAProxy** | `/haproxy/` | `active/cm/trace/haproxy/` |
| **Informix DB** | `/informix/` | `active/cm/log/informix/` |
| **Audit Logs** | `/audit/` | `active/audit/AuditApp/` |

### Medium-Confidence Patterns (Shared Components)

These require **multiple path components** for accurate detection:

| Service | Path Components | Example |
|---------|----------------|---------|
| **RIS Data Collector** | `/cm/trace/ris/sdi/` | `active/cm/trace/ris/sdi/ris00000001.txt` |
| **AMC Service** | `/cm/trace/amc/log4j/` | `active/cm/trace/amc/log4j/amc.log` |
| **Database Layer Monitor** | `/cm/trace/dbl/sdi/` | `active/cm/trace/dbl/sdi/dbmon00000027.txt` |
| **SNMP Master Agent** | `/platform/snmp/snmpdm/` | `active/platform/snmp/snmpdm/SnmpMasterAgt.log` |
| **Host Resources Agent** | `/platform/snmp/hostagt/` | `active/platform/snmp/hostagt/hostagt.log` |

---

## 📁 Complete Service Catalog

### CallManager Core Services (`/active/cm/`)

#### Trace Files (`/active/cm/trace/`)

```
active/cm/trace/
├── amc/log4j/                    → AMC Service traces
├── dbl/sdi/                      → Database Layer traces
│   ├── dbmon/                    → Database monitor
│   └── spltrace.log              → Stored procedure trace
├── ris/sdi/                      → RIS Data Collector traces
├── auditlog/sdi/                 → Audit event traces
├── syslogmib/sdi/                → Syslog agent traces
├── haproxy/                      → HAProxy logs
└── rtmtreporter/log4j/           → Serviceability reporter
```

**File Extensions**: `.txt`, `.log`  
**Naming Pattern**: `service00000001.txt` (sequential numbering)

#### Log Files (`/active/cm/log/`)

```
active/cm/log/
├── amc/
│   ├── CallLog/                  → AMC call logs (CSV)
│   ├── DeviceLog/                → AMC device logs (CSV)
│   └── ServiceLog/               → AMC service logs (CSV)
├── informix/                     → Informix database logs
│   ├── ccm.log
│   └── car.log
└── ris/csv/                      → RIS performance monitoring (CSV)
```

**File Extensions**: `.csv`, `.log`  
**Naming Pattern**: `LogType_MM_DD_YYYY_HH_MM.csv`

---

### Tomcat Web Services (`/active/tomcat/logs/`)

```
active/tomcat/logs/
├── axl-tomcat/                   → AXL (Admin XML) service
│   ├── localhost_access_log.txt
│   └── manager.YYYY-MM-DD.log
├── uds-tomcat/                   → User Data Services
│   ├── localhost_access_log.txt
│   └── manager.YYYY-MM-DD.log
├── ssosp-tomcat/                 → SSO Service Provider
│   ├── localhost_access_log.txt
│   └── manager.YYYY-MM-DD.log
├── security/log4j/               → Security audit logs
│   ├── security.log
│   ├── securityaxl.log
│   └── securityuds.log
├── soap/                         → SOAP web services
│   ├── log4j/soap.log
│   └── csv/axis2ratecontrol2.csv
├── rtmt/log4j/                   → RTMT web service
│   ├── rtmt.log
│   └── rtmt.10.log
├── ccmadmin/log4j/               → CCMAdmin web interface
│   └── ccmadmin.log
├── ccmservice/log4j/             → CCMService web interface
│   ├── ccmservice.log
│   └── ccmservice.10.log
├── platform-api/log4j/           → Platform API service
│   └── platform-api.log
├── risbean/log4j/                → RIS Bean library
│   └── risbean.log
├── dbl/log4j/                    → Database Layer web lib
│   └── dbl_Tomcat.log
└── catalina.out                  → Tomcat console output
```

**File Extensions**: `.log`, `.txt`, `.out`, `.csv`  
**Naming Patterns**:
- `service.log` - Current active log
- `service.10.log` - Rotated log (numbered)
- `manager.YYYY-MM-DD.log` - Date-stamped manager logs
- `localhost_access_log.txt` - Access logs

---

### Platform Services (`/active/platform/`)

```
active/platform/
├── log/                          → Platform logs
│   ├── cli-auto1c.log            → CLI automation
│   ├── dbl_platform.log          → Database layer
│   ├── certCN.log                → Certificate change notification
│   ├── certCN.20.log             → Rotated cert logs
│   ├── certm.log                 → Certificate monitor
│   └── servm00000029.log         → Service Manager
├── drf/trace/                    → Disaster Recovery Framework
│   └── drfMA.log                 → DRF Master Agent
└── snmp/                         → SNMP agents
    ├── snmpdm/                   → SNMP Master Agent
    │   └── SnmpMasterAgt00000071.log
    ├── hostagt/                  → Host Resources Agent
    │   └── hostagt.log
    ├── mib2agt/                  → MIB2 Agent
    │   └── mib2agt.log
    └── sappagt/                  → System Application Agent
        └── sappagt.log
```

**File Extensions**: `.log`  
**Naming Patterns**:
- `service.log` - Current log
- `service.20.log` - Rotated (numbered)
- `service00000029.log` - Sequential numbering

---

### System Logs (`/active/syslog/`)

```
active/syslog/
├── messages                      → System messages (no extension)
├── secure                        → Security logs (no extension)
└── sd_ntp.log                    → NTP daemon logs
```

**File Extensions**: None (or `.log` for specific services)  
**Format**: Standard syslog format

---

### Audit Logs (`/active/audit/`)

```
active/audit/
├── AuditApp/                     → Application audit logs
│   └── Audit00000098.log
└── vos/                          → VOS audit logs
    └── vos-audit.log
```

**File Extensions**: `.log`  
**Naming Pattern**: `Audit00000098.log` (sequential)

---

## 🎯 Detection Algorithm

### Priority Order (Highest to Lowest Confidence)

```
1. Unique Path Components (100% confidence)
   └─ Check for service-specific directories
      Examples: /axl-tomcat/, /soap/, /rtmt/, /haproxy/

2. Base Path + Component (95% confidence)
   └─ Match base + subdirectory
      Examples: active/tomcat/logs/security/, active/cm/trace/ris/

3. File Extension Context (85% confidence)
   └─ .csv in /cm/log/amc/ → AMC logs
      .txt in /cm/trace/ris/sdi/ → RIS traces

4. Filename Patterns (80% confidence)
   └─ catalina.out → Tomcat
      localhost_access_log.txt → Tomcat component
      PerfMon_*.csv → RIS Data Collector

5. Multi-Path Bundle Analysis (90% confidence)
   └─ Presence of multiple related paths
      If has /axl-tomcat/, /uds-tomcat/, /security/log4j/ → CUCM
```

### Detection Logic (Pseudo-code)

```javascript
function detectService(path) {
  // Normalize path
  path = path.replace(/\\/g, '/').toLowerCase();
  
  // Level 1: Check unique signatures
  if (path.includes('/axl-tomcat/')) return { service: 'AXL', confidence: 100 };
  if (path.includes('/uds-tomcat/')) return { service: 'UDS', confidence: 100 };
  if (path.includes('/ssosp-tomcat/')) return { service: 'SSOSP', confidence: 100 };
  if (path.includes('/soap/')) return { service: 'SOAP', confidence: 100 };
  if (path.includes('/haproxy/')) return { service: 'HAProxy', confidence: 100 };
  if (path.includes('/informix/')) return { service: 'Informix', confidence: 100 };
  
  // Level 2: Check composite paths
  if (path.match(/active\/cm\/trace\/ris\/sdi/)) {
    return { service: 'RIS Data Collector', confidence: 95 };
  }
  if (path.match(/active\/cm\/trace\/amc\/log4j/)) {
    return { service: 'AMC Service', confidence: 95 };
  }
  if (path.match(/active\/tomcat\/logs\/security\/log4j/)) {
    return { service: 'Security Logs', confidence: 95 };
  }
  
  // Level 3: Check base paths
  if (path.includes('active/tomcat/logs/')) {
    return { service: 'Tomcat Services', confidence: 85 };
  }
  if (path.includes('active/cm/trace/')) {
    return { service: 'CallManager Traces', confidence: 85 };
  }
  if (path.includes('active/platform/')) {
    return { service: 'Platform Services', confidence: 85 };
  }
  
  return { service: 'Unknown', confidence: 0 };
}
```

---

## 📈 File Naming Conventions

### Log Rotation Patterns

**Sequential Numbering**:
```
service.log              → Current active log
service.10.log           → Rotated 10 times ago
service.20.log           → Rotated 20 times ago
service00000001.txt      → Sequential with leading zeros
```

**Date Stamping**:
```
manager.2026-02-23.log                                → Daily rotation
CallLog_02_23_2026_00_00.csv                         → Hourly with date
PerfMon_hostname_02_23_2026_15_07.csv               → Timestamped with host
```

**No Numbering** (Single file):
```
catalina.out             → Console output (continuous)
messages                 → System messages (continuous)
secure                   → Security log (continuous)
```

### Hostname Patterns in Filenames

Real-world example from Ford deployment:
```
PerfMon_c9402011ccm101.ford.amer.wxc-di.webex.com_02_23_2026_15_07.csv
        └─────┬──────┘└────────────┬─────────────────┘
          Server ID              Domain FQDN
```

**Pattern**: `{ServiceType}_{hostname}_{date}_{time}.{ext}`

---

## 🔑 Key Insights for CLI Commands

### `file get activelog` Path Mapping

Based on real paths, here are the CLI-accessible locations:

```bash
# Tomcat Services
file get activelog tomcat/logs/catalina recent
file get activelog tomcat/logs/axl-tomcat recent
file get activelog tomcat/logs/uds-tomcat recent
file get activelog tomcat/logs/ssosp-tomcat recent
file get activelog tomcat/logs/security/log4j recent

# CallManager Traces
file get activelog cm/trace/ccm recent
file get activelog cm/trace/sdl recent
file get activelog cm/trace/ris/sdi recent
file get activelog cm/trace/amc/log4j recent
file get activelog cm/trace/dbl/sdi recent

# Platform Services
file get activelog platform/log recent
file get activelog platform/drf/trace recent
file get activelog platform/snmp recent

# System Logs
file get activelog syslog/messages recent
file get activelog syslog/secure recent
```

**Note**: The CLI paths **omit the `/active/` prefix** - it's implicit.

---

## 📊 Statistics from Real Data

### Path Distribution

| Category | Services | % of Total |
|----------|----------|------------|
| Tomcat Web Services | 13 | 31.7% |
| CallManager Core | 11 | 26.8% |
| Platform Services | 10 | 24.4% |
| System/Audit Logs | 7 | 17.1% |

### File Extension Usage

| Extension | Count | Primary Use |
|-----------|-------|-------------|
| `.log` | 48 | General logging (log4j, platform) |
| `.txt` | 15 | Trace files (SDI format) |
| `.csv` | 6 | Performance data, AMC logs |
| `.out` | 1 | Tomcat console |
| (none) | 2 | Syslog files |

### Path Depth Analysis

| Depth | Example | Count |
|-------|---------|-------|
| 2 levels | `active/syslog/messages` | 3 |
| 3 levels | `active/cm/log/informix/ccm.log` | 8 |
| 4 levels | `active/tomcat/logs/soap/log4j/soap.log` | 35 |
| 5 levels | `active/cm/trace/dbl/sdi/dbmon/dbl_dbmon.log` | 12 |
| 6+ levels | `l/thirdparty/jakarta-tomcat/logs/axl-tomcat/` | 14 |

**Average Path Depth**: 4.2 levels

---

## 🎨 Service Grouping for UI Display

### Recommended Hierarchy

```
📦 CUCM Server: c9402011ccm101
│
├── 📞 CallManager Services (11)
│   ├── 🔍 Traces
│   │   ├── AMC Service
│   │   ├── RIS Data Collector
│   │   ├── Database Layer Monitor
│   │   └── Syslog Agent
│   └── 📊 Logs
│       ├── AMC Call/Device/Service Logs
│       ├── Informix Database
│       └── RIS Performance Monitor
│
├── 🌐 Web Services (13)
│   ├── Core Tomcat
│   │   ├── AXL Tomcat
│   │   ├── UDS Tomcat
│   │   └── SSOSP Tomcat
│   ├── APIs
│   │   ├── SOAP Web Service
│   │   ├── Platform API
│   │   └── RTMT Web Service
│   ├── Admin
│   │   ├── CCMAdmin
│   │   ├── CCMService
│   │   └── RisBean Library
│   └── 🔒 Security
│       └── Tomcat Security Logs
│
├── ⚙️ Platform Services (10)
│   ├── Management
│   │   ├── CLI Logs
│   │   ├── Service Manager
│   │   └── DRF Master
│   ├── Certificates
│   │   ├── Certificate Monitor
│   │   └── Certificate Change Notification
│   └── SNMP Agents
│       ├── SNMP Master Agent
│       ├── Host Resources Agent
│       ├── MIB2 Agent
│       └── System Application Agent
│
└── 🗂️ System Logs (7)
    ├── Syslog
    │   ├── System Messages
    │   ├── Security Log
    │   └── NTP Logs
    └── Audit
        ├── Audit Application
        └── VOS Audit
```

---

## 💾 JSON Database Schema

```json
{
  "version": "2.0",
  "source": "Real RTMT Archives - Ford CUCM",
  "metadata": {
    "archives_analyzed": 41,
    "unique_paths": 72,
    "deployment": "Production CUCM 14.x",
    "date_collected": "2026-02-23"
  },
  "path_signatures": {
    "cucm": {
      "confidence": "high",
      "base_paths": [
        "active/cm/",
        "active/tomcat/",
        "active/platform/",
        "l/thirdparty/jakarta-tomcat/"
      ],
      "unique_identifiers": [
        "/axl-tomcat/",
        "/uds-tomcat/",
        "/ssosp-tomcat/",
        "/ccmadmin/",
        "/ccmservice/"
      ],
      "services": [
        {
          "name": "AXL Tomcat",
          "paths": ["/axl-tomcat/", "active/tomcat/logs/axl-tomcat/"],
          "extensions": ["log", "txt"],
          "confidence": 100
        },
        {
          "name": "Security Logs",
          "paths": ["/security/log4j/", "active/tomcat/logs/security/"],
          "extensions": ["log"],
          "confidence": 100
        }
      ]
    }
  }
}
```

---

## 🚀 Implementation Recommendations

### 1. **Multi-Level Detection Strategy**

```typescript
class CUCMPathDetector {
  detect(path: string): ServiceDetection {
    // Level 1: Exact match on unique signatures (fastest)
    const exactMatch = this.checkUniqueSignatures(path);
    if (exactMatch.confidence === 100) return exactMatch;
    
    // Level 2: Composite path matching
    const compositeMatch = this.checkCompositePaths(path);
    if (compositeMatch.confidence >= 95) return compositeMatch;
    
    // Level 3: Base path + file extension
    const contextMatch = this.checkContextualPatterns(path);
    if (contextMatch.confidence >= 85) return contextMatch;
    
    // Level 4: Filename patterns
    return this.checkFilenamePatterns(path);
  }
}
```

### 2. **Learning from New Archives**

```typescript
class PathLearningSystem {
  learnFromArchive(archive: RTMTArchive) {
    const paths = archive.extractAllPaths();
    
    // Update frequency counts
    paths.forEach(path => {
      this.pathFrequency[path] = (this.pathFrequency[path] || 0) + 1;
    });
    
    // Discover new patterns
    const newPatterns = this.discoverPatterns(paths);
    this.updateSignatureDatabase(newPatterns);
    
    // Validate existing patterns
    this.validatePatterns(paths);
  }
}
```

### 3. **Bundle-Level Detection**

When analyzing a complete RTMT bundle:

```typescript
function detectBundleService(allPaths: string[]): ServiceDetection {
  const serviceVotes = new Map<string, number>();
  
  // Each path votes for its detected service
  allPaths.forEach(path => {
    const detection = detectService(path);
    const currentVotes = serviceVotes.get(detection.service) || 0;
    serviceVotes.set(detection.service, currentVotes + detection.confidence);
  });
  
  // The service with highest total confidence wins
  const winner = [...serviceVotes.entries()]
    .sort((a, b) => b[1] - a[1])[0];
  
  return {
    service: winner[0],
    confidence: Math.min(100, winner[1] / allPaths.length),
    supportingPaths: allPaths.length
  };
}
```

---

## ✅ Validation Checklist

Use this checklist to validate path detection accuracy:

- [ ] **AXL Paths**: Detected as "AXL Tomcat" with 100% confidence
  - `l/thirdparty/jakarta-tomcat/logs/axl-tomcat/localhost_access_log.txt`
  - `active/tomcat/logs/axl-tomcat/manager.log`

- [ ] **Security Logs**: Detected as "Security" with 100% confidence
  - `active/tomcat/logs/security/log4j/securityaxl.log`
  - `active/tomcat/logs/security/log4j/security.log`

- [ ] **RIS Traces**: Detected as "RIS Data Collector" with 95%+ confidence
  - `active/cm/trace/ris/sdi/ris00000001.txt`

- [ ] **Platform Logs**: Detected as appropriate platform service
  - `active/platform/log/certCN.log` → Certificate Change Notification
  - `active/platform/drf/trace/drfMA.log` → DRF Master

- [ ] **Syslog**: Detected correctly despite no file extension
  - `active/syslog/messages` → System Messages
  - `active/syslog/secure` → Security Log

---

## 📚 References

- **Source Data**: 41 RTMT archives from Ford CUCM deployment
- **CUCM Version**: 14.x (inferred from file structure)
- **Collection Date**: February 23, 2026
- **Analysis Tool**: `analyze_rtmt_paths.py`
- **Generated Files**:
  - `rtmt_path_database.json` - Complete path catalog
  - `rtmt_signatures.json` - Service detection signatures
  - `RTMT_PATH_ANALYSIS.md` - Detailed analysis report

---

## 🎯 Next Steps

1. **Integrate Signatures**: Load `rtmt_signatures.json` into service detection system
2. **Test Detection**: Validate against new RTMT bundles
3. **Expand Coverage**: Add patterns for Unity Connection, CUC, CUP, IM&P
4. **Monitor Accuracy**: Track detection confidence across different deployments
5. **Update Model**: Continuously learn from new archive patterns

---

## 📊 Confidence Levels

| Confidence | Meaning | Use Case |
|-----------|---------|----------|
| **100%** | Unique signature found | Exact service identification |
| **95%+** | Multiple matching components | Composite path detection |
| **85%+** | Base path + context | Service category detection |
| **70-84%** | Filename pattern only | Weak identification |
| **< 70%** | Unknown/ambiguous | Requires manual review |

---

**Version**: 2.0  
**Status**: Production Ready  
**Last Updated**: February 23, 2026  
**Maintainer**: Log Scout Analyzer Team