# Graph Report - D:\Siddhesh\PakdaRe - Copy\pakdare  (2026-04-22)

## Corpus Check
- 35 files · ~20,695 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 91 nodes · 71 edges · 30 communities detected
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]

## God Nodes (most connected - your core abstractions)
1. `App()` - 4 edges
2. `WardModal()` - 4 edges
3. `initAudio()` - 4 edges
4. `generateReport()` - 3 edges
5. `ComplaintModal()` - 2 edges
6. `rand7()` - 2 edges
7. `RISK_STAT_COLOR()` - 2 edges
8. `timeAgo()` - 2 edges
9. `ComplaintCard()` - 2 edges
10. `STAT_CARDS()` - 2 edges

## Surprising Connections (you probably didn't know these)
- `App()` --calls--> `useToast()`  [INFERRED]
  D:\Siddhesh\PakdaRe - Copy\pakdare\src\App.jsx → D:\Siddhesh\PakdaRe - Copy\pakdare\src\components\ui\Toast.jsx
- `App()` --calls--> `useComplaints()`  [INFERRED]
  D:\Siddhesh\PakdaRe - Copy\pakdare\src\App.jsx → D:\Siddhesh\PakdaRe - Copy\pakdare\src\hooks\useComplaints.js
- `App()` --calls--> `useSLAEngine()`  [INFERRED]
  D:\Siddhesh\PakdaRe - Copy\pakdare\src\App.jsx → D:\Siddhesh\PakdaRe - Copy\pakdare\src\hooks\useSLAEngine.js
- `ComplaintModal()` --calls--> `timeAgo()`  [INFERRED]
  D:\Siddhesh\PakdaRe - Copy\pakdare\src\components\modals\ComplaintModal.jsx → D:\Siddhesh\PakdaRe - Copy\pakdare\src\utils\dateHelper.js
- `WardModal()` --calls--> `RISK_LABEL()`  [INFERRED]
  D:\Siddhesh\PakdaRe - Copy\pakdare\src\components\modals\WardModal.jsx → D:\Siddhesh\PakdaRe - Copy\pakdare\src\data\wardData.js

## Communities

### Community 0 - "Community 0"
Cohesion: 0.2
Nodes (4): App(), useToast(), useComplaints(), useSLAEngine()

### Community 1 - "Community 1"
Cohesion: 0.32
Nodes (4): RISK_LABEL(), rand7(), RISK_STAT_COLOR(), WardModal()

### Community 2 - "Community 2"
Cohesion: 0.47
Nodes (4): Dashboard(), RISK_BAR_COLOR(), RiskBar(), STAT_CARDS()

### Community 3 - "Community 3"
Cohesion: 0.5
Nodes (2): ComplaintCard(), timeAgo()

### Community 4 - "Community 4"
Cohesion: 0.7
Nodes (4): initAudio(), playPop(), playSuccess(), playWarn()

### Community 5 - "Community 5"
Cohesion: 0.4
Nodes (2): ComplaintModal(), timeAgo()

### Community 6 - "Community 6"
Cohesion: 0.5
Nodes (0): 

### Community 7 - "Community 7"
Cohesion: 0.5
Nodes (0): 

### Community 8 - "Community 8"
Cohesion: 0.5
Nodes (0): 

### Community 9 - "Community 9"
Cohesion: 0.83
Nodes (3): dataUrlToBase64(), generateReport(), getMimeType()

### Community 10 - "Community 10"
Cohesion: 0.67
Nodes (0): 

### Community 11 - "Community 11"
Cohesion: 0.67
Nodes (0): 

### Community 12 - "Community 12"
Cohesion: 0.67
Nodes (0): 

### Community 13 - "Community 13"
Cohesion: 1.0
Nodes (0): 

### Community 14 - "Community 14"
Cohesion: 1.0
Nodes (0): 

### Community 15 - "Community 15"
Cohesion: 1.0
Nodes (0): 

### Community 16 - "Community 16"
Cohesion: 1.0
Nodes (0): 

### Community 17 - "Community 17"
Cohesion: 1.0
Nodes (0): 

### Community 18 - "Community 18"
Cohesion: 1.0
Nodes (0): 

### Community 19 - "Community 19"
Cohesion: 1.0
Nodes (0): 

### Community 20 - "Community 20"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "Community 21"
Cohesion: 1.0
Nodes (0): 

### Community 22 - "Community 22"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "Community 23"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "Community 24"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "Community 25"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "Community 26"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "Community 27"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Community 28"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "Community 29"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `Community 13`** (2 nodes): `ChatBot()`, `ChatBot.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 14`** (2 nodes): `Header.jsx`, `Header()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (2 nodes): `LoadingScreen.jsx`, `LoadingScreen()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (2 nodes): `ModeBanner.jsx`, `ModeBanner()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (2 nodes): `NavTabs.jsx`, `NavTabs()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (2 nodes): `TickerBar.jsx`, `TickerBar()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (2 nodes): `FileReportModal.jsx`, `FileReportModal()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (2 nodes): `MapPage.jsx`, `MapPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (2 nodes): `BeforeAfterSlider()`, `BeforeAfterSlider.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (2 nodes): `exportCSV.js`, `exportCSV()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (1 nodes): `eslint.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (1 nodes): `vite.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (1 nodes): `i18n.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (1 nodes): `main.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (1 nodes): `supabase.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (1 nodes): `hierarchy.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (1 nodes): `constants.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Are the 3 inferred relationships involving `App()` (e.g. with `useToast()` and `useComplaints()`) actually correct?**
  _`App()` has 3 INFERRED edges - model-reasoned connections that need verification._