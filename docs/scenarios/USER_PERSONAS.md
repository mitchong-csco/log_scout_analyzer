# User Personas - Log Scout Analyzer

**Purpose:** Define the primary users of Log Scout Analyzer  
**Audience:** Product, Engineering, UX, Documentation teams  
**Last Updated:** 2024-02-24  

---

## 🎯 Primary Persona: Kona Chong

### Background

**Profile:**
- **Name:** Kona Chong
- **Age:** 26
- **Role:** UCAPPS TAC Engineer at Cisco
- **Location:** Remote (works from home)
- **Experience:** 6 months with Cisco UC support
- **Education:** BS in Computer Science

**Career Context:**
- New to TAC, transitioning from IT helpdesk
- Learning CUCM, Unity Connection, IM&P, and Expressway
- Handles Priority 2 and 3 cases independently
- Escalates Priority 1 or complex cases to L3
- Manages 5-8 active cases simultaneously

---

### Technical Skills

**Strong:**
- VS Code and modern development tools
- Basic Python scripting
- Windows/Linux command line
- Log file navigation
- Pattern recognition (developing)

**Learning:**
- SIP protocol and call flows
- CUCM administration
- Cisco log formats (SDL, RTMT)
- Root cause analysis techniques
- Network troubleshooting

**Tools Used Daily:**
- VS Code (primary editor)
- RTMT (Real-Time Monitoring Tool)
- Cisco TAC case management system
- WebEx for customer calls
- Jabber for team collaboration

---

### Typical Day

**Morning (8 AM - 12 PM):**
- Review overnight case updates (5-8 cases)
- Customer calls for case triage (2-3 calls)
- Log analysis for active investigations (3-4 hours)
- Collaboration with L3 engineers (Slack/Jabber)

**Afternoon (1 PM - 5 PM):**
- Deep dive on Priority 2 cases
- Write case notes and RCA drafts
- Test customer-provided configurations in lab
- Knowledge base research
- Team meetings and training sessions

**Weekly Workload:**
- Active cases: 5-8 (various priorities)
- New cases per week: 3-5
- Cases resolved per week: 4-6
- Average case duration: 3-7 days

---

### Pain Points

**Log Analysis Challenges:**
- 😫 **Too many files:** "RTMT bundles have 100+ log files - where do I start?"
- 😫 **Manual grep:** "I spend hours doing grep commands across files"
- 😫 **Context switching:** "Hard to remember what I found yesterday"
- 😫 **Pattern recognition:** "I don't know all the error patterns yet"

**Workflow Friction:**
- 😫 **Lost context:** "Closing VS Code means losing my investigation state"
- 😫 **File clutter:** "My workspace gets messy with old case files"
- 😫 **Manual cleanup:** "Forget to delete old bundles, disk fills up"
- 😫 **Re-importing:** "Have to re-import bundles every day"

**Knowledge Gaps:**
- 😫 **Experience:** "Senior engineers spot issues instantly, I'm still learning"
- 😫 **Documentation:** "TAC knowledge base is vast, hard to find relevant info"
- 😫 **Patterns:** "Don't know which log messages are critical vs. informational"

---

### Goals & Motivations

**Professional Goals:**
- 🎯 Become a strong L2 TAC engineer within 1 year
- 🎯 Handle Priority 1 cases independently
- 🎯 Build expertise in SIP call flows and troubleshooting
- 🎯 Contribute to team knowledge base

**Daily Goals:**
- 🎯 Find root cause of issues quickly and accurately
- 🎯 Provide excellent customer service
- 🎯 Learn from every case
- 🎯 Maintain organized case files

**Tool Expectations:**
- 🎯 "Help me find issues I might miss"
- 🎯 "Remember my work context between sessions"
- 🎯 "Guide me to the relevant log entries"
- 🎯 "Make cleanup automatic, not manual"

---

### Scenario Usage

Kona appears in these scenarios:
- ✅ **Scenario 4:** Workspace Persistence & Bundle Deletion
- 🔄 **Scenario 2:** Multi-File Investigation (coming soon)
- 🔄 **Scenario 5:** Error Recovery (coming soon)

---

## 👤 Secondary Persona: Marcus Lee (Senior TAC)

### Background

**Profile:**
- **Name:** Marcus Lee
- **Age:** 34
- **Role:** Senior UCAPPS TAC Engineer (L3)
- **Location:** San Jose, CA
- **Experience:** 8 years with Cisco UC, 4 years TAC
- **Specialty:** SIP trunking, call routing, complex escalations

**Career Context:**
- Handles Priority 1 escalations
- Mentors junior engineers like Kona
- Writes knowledge base articles
- Participates in product bug review
- Manages 3-5 high-complexity cases

---

### Technical Skills

**Expert Level:**
- Deep SIP protocol knowledge
- CUCM administration and architecture
- Log analysis and correlation
- Network packet capture analysis
- Root cause analysis

**Tools Mastery:**
- RTMT advanced features
- Wireshark for SIP analysis
- Custom log parsing scripts
- VS Code with extensions
- Cisco internal tools

---

### Pain Points

**Different from Junior Engineers:**
- 😫 **Volume:** "Too many logs to analyze manually, even with experience"
- 😫 **Correlation:** "Need to correlate events across 5+ systems"
- 😫 **Documentation:** "Need to export findings for RCA reports"
- 😫 **Mentoring:** "Want to teach Kona patterns to look for"

---

### Goals

- 🎯 Solve complex multi-system issues efficiently
- 🎯 Build reusable analysis patterns
- 🎯 Share knowledge with team
- 🎯 Identify product bugs early

---

### Scenario Usage

Marcus appears in these scenarios:
- 🔄 **Scenario 7:** Multiple Bundles per Case
- 🔄 **Scenario 10:** Pattern Override Workflow

---

## 👤 Tertiary Persona: Sarah Chen (Enterprise Engineer)

### Background

**Profile:**
- **Name:** Sarah Chen
- **Age:** 35
- **Role:** Senior UC Engineer at Fortune 500 company
- **Location:** Chicago, IL
- **Experience:** 8 years managing enterprise UC infrastructure
- **Team Size:** Manages team of 3 UC engineers

**Career Context:**
- Manages 5,000+ user UC environment
- Handles escalations from IT helpdesk
- Plans and executes UC upgrades
- Interfaces with Cisco TAC for support
- On-call rotation for critical issues

---

### Technical Skills

**Enterprise Focus:**
- CUCM cluster management
- High availability design
- Performance monitoring
- Change management
- Vendor management

**Different from TAC:**
- Focuses on single customer (own company)
- Deep knowledge of own environment
- Less breadth, more depth in specific configs
- Strategic planning vs. rapid troubleshooting

---

### Pain Points

- 😫 **After-hours incidents:** "Need to troubleshoot at 2 AM"
- 😫 **TAC preparation:** "Spend hours preparing logs for TAC cases"
- 😫 **Change validation:** "Did my upgrade cause this issue?"
- 😫 **Trend analysis:** "Is this a new problem or recurring?"

---

### Goals

- 🎯 Minimize downtime for business users
- 🎯 Proactively identify issues before users report
- 🎯 Prepare comprehensive info for TAC cases
- 🎯 Document incident responses for team

---

### Scenario Usage

Sarah appears in these scenarios:
- ✅ **Scenario 1:** Import & Analyze RTMT Bundle
- 🔄 **Scenario 3:** Export Results for TAC Case
- 🔄 **Scenario 6:** SIP Call Flow Analysis

---

## 🎭 Persona Comparison Matrix

| Aspect | Kona (Junior TAC) | Marcus (Senior TAC) | Sarah (Enterprise) |
|--------|-------------------|---------------------|-------------------|
| **Experience** | 6 months | 8 years | 8 years |
| **Focus** | Learning + Triage | Complex escalations | Single environment |
| **Cases/Week** | 3-5 new | 1-2 new (complex) | Varies (internal) |
| **UC Depth** | Learning | Expert | Deep in own setup |
| **Tool Needs** | Guidance, learning | Efficiency, automation | Preparation, docs |
| **Primary Goal** | Find issues fast | Solve complex issues | Prevent incidents |
| **Risk Tolerance** | Learning, mistakes OK | High-stakes, must be right | Business impact focus |

---

## 🎯 Design Implications

### For Kona (Junior TAC):
- ✅ Clear guidance on where to look
- ✅ Pattern detection with explanations
- ✅ Context preservation across sessions
- ✅ Simple, clean workspace management
- ✅ Learning-friendly error messages

### For Marcus (Senior TAC):
- ✅ Cross-file correlation features
- ✅ Custom pattern overrides
- ✅ Export for documentation
- ✅ Advanced filtering and search
- ✅ Bulk operations

### For Sarah (Enterprise):
- ✅ Trend analysis over time
- ✅ Before/after comparisons
- ✅ TAC case preparation features
- ✅ Scheduled analysis reports
- ✅ Integration with monitoring tools

---

## 📊 Usage Statistics (Target)

**User Distribution:**
- Kona-type users (Junior TAC): 40%
- Marcus-type users (Senior TAC): 30%
- Sarah-type users (Enterprise): 20%
- Other users (Partners, developers): 10%

**Feature Prioritization:**
- Critical scenarios focus on Kona's needs
- Important scenarios address Marcus's efficiency
- Future scenarios explore Sarah's enterprise needs

---

## 🔄 Persona Evolution

### As Kona Grows:
- Month 1-3: Needs heavy guidance
- Month 4-6: Recognizing patterns independently
- Month 7-12: Becoming efficient, needs fewer hints
- Year 2+: Transitions toward Marcus-type workflows

### Adapting the Tool:
- Progressive disclosure of advanced features
- Graduation from "learning mode" to "expert mode"
- Customizable assistance level
- Track user proficiency over time

---

## 📚 Using These Personas

### In Scenario Documents:
- Reference persona by name
- Use their language and pain points
- Design for their skill level
- Address their specific goals

### In Feature Design:
- Ask: "Would Kona understand this?"
- Ask: "Does this save Marcus time?"
- Ask: "Does Sarah need this for TAC cases?"

### In Testing:
- Test scenarios from persona perspective
- Validate against persona goals
- Measure persona-specific success metrics

---

## 📝 Feedback & Updates

**How to Contribute:**
- Observed new user patterns? Add them here
- User interviews reveal new pain points? Update personas
- Feature usage data contradicts assumptions? Revise personas

**Review Schedule:**
- Quarterly persona review
- Update based on user research
- Validate with actual TAC engineers
- Incorporate telemetry data

---

**Maintained By:** Product & UX Team  
**Contributors:** Engineering, TAC, Field Engineers  
**Last Review:** 2024-02-24  
**Next Review:** 2024-05-24