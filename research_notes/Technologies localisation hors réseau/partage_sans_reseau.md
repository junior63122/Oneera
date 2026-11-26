# Sharing friends' positions and messages without mobile network or internet (festival / stadium), status late 2026

Research date: 2026-11-26. Method: ~21 web searches/fetches. Two hosts (docs.ditto.live, hackmd.io) were unreachable from the research sandbox (network allowlist), so Ditto details come from search snippets of its docs, not full pages. Items marked "(unsourced / from background knowledge)" in Inferences were NOT verified in this session and must be checked before being quoted.

---

## Q1. Bluetooth LE between phones (advertising relays, BLE mesh, store-and-forward): what works on iOS + Android, including in background?

### Takeaway
BLE is the only radio that every iPhone and Android phone exposes to third-party apps with some background capability, so it is the backbone of every "no network" consumer app (Bridgefy, bitchat, Ditto's cross-platform link). But iOS background rules are severe: a backgrounded iOS app's advertising moves its service UUID into Apple's proprietary "overflow area" that only iOS devices scanning for that UUID can see, so Android cannot reliably discover a backgrounded/locked iPhone by advertising alone. Workable designs invert roles (iPhone as central/scanner, or GATT connections) and rely on gossip through Android or foreground iPhones.

### Cited Findings
**iOS Core Bluetooth background rules (Apple official, archive doc still referenced)**
- With `bluetooth-central` background mode: `CBCentralManagerScanOptionAllowDuplicatesKey` is ignored, multiple discoveries are coalesced into one event, and when all scanning apps are in background "the interval at which your central device scans ... increases", so discovery takes longer. — [Apple, Core Bluetooth Background Processing](https://developer.apple.com/library/archive/documentation/NetworkingInternetWeb/Conceptual/CoreBluetooth_concepts/CoreBluetoothBackgroundProcessingForIOSApps/PerformingTasksWhileYourAppIsInTheBackground.html)
- With `bluetooth-peripheral` background mode: local name is not advertised; "All service UUIDs ... are placed in a special 'overflow' area; they can be discovered only by an iOS device that is explicitly scanning for them"; advertising frequency "may decrease" when all advertising apps are in background. — [same Apple doc](https://developer.apple.com/library/archive/documentation/NetworkingInternetWeb/Conceptual/CoreBluetooth_concepts/CoreBluetoothBackgroundProcessingForIOSApps/PerformingTasksWhileYourAppIsInTheBackground.html)
- On BLE wake-up an app gets "around 10 seconds to complete a task"; apps that spend too long can be throttled or killed. State preservation/restoration (restore identifiers) lets iOS relaunch the app for BLE events after it was terminated by the system. — [same Apple doc](https://developer.apple.com/library/archive/documentation/NetworkingInternetWeb/Conceptual/CoreBluetooth_concepts/CoreBluetoothBackgroundProcessingForIOSApps/PerformingTasksWhileYourAppIsInTheBackground.html)
- Apple overflow-area constant documented as `CBAdvertisementDataOverflowServiceUUIDsKey`. — [Apple docs](https://developer.apple.com/tutorials/data/documentation/corebluetooth/cbadvertisementdataoverflowserviceuuidskey.md)
- Developer forums: a non-Apple central "will not be possible to decode the overflow area, and the format of this area is not documented"; community report that the UK NHS COVID app made Android match the undocumented one-hot bitmask of the overflow area (works but unsupported, can change). — [Apple forums thread 837516](https://developer.apple.com/forums/thread/837516); [Apple forums 814450](https://developer.apple.com/forums/thread/814450)
- A 2026-era forum thread reports BLE advertising/scanning communication "broken on iPhone 17" with CBPeripheralManager + CBCentralManager workflow (individual report; sign of fragility across hardware generations). — [Apple forums 815922](https://developer.apple.com/forums/thread/815922)

**Lessons from 2020 COVID contact-tracing (best real-world large-scale evidence of iOS background BLE limits)**
- Singapore's TraceTogether did not work properly in background on iOS; users were told to keep the app open on screen. Apps in Australia, France and UK were "not sending the necessary Bluetooth signals when the iPhone was locked." — [BBB National Programs](https://bbbprograms.org/media-center/bd/insights/2020/07/09/caution-and-criticism-contact-tracing-through-mobile-apps); [Kin + Carta / Medium](https://medium.com/kinandcartacreated/why-bespoke-contact-tracing-apps-dont-work-so-well-on-ios-df0dabd95d42)
- Reported asymmetry: a backgrounded iPhone app can still see other iPhones and Androids by scanning, while Android cannot see backgrounded iPhones; Singapore turned it into a gossip protocol so iPhones were visible whenever an Android with the app was nearby (anecdotal blog). — [Kin + Carta / Medium](https://medium.com/kinandcartacreated/why-bespoke-contact-tracing-apps-dont-work-so-well-on-ios-df0dabd95d42)
- Apple only lifted the background limitation via the dedicated Exposure Notification API (not available to general apps). — [Wikipedia, Exposure Notification](https://en.wikipedia.org/wiki/Exposure_Notification)

**Range / throughput / density**
- BLE theoretical max 2 Mb/s, ~1.4 Mb/s expected at 10 m; obstacles reduce range/throughput (two walls -> ~75% of max). — [search summary of TU/e "Mobile Bluetooth mesh networks" + related](https://research.tue.nl/en/publications/mobile-bluetooth-mesh-networks-performance-evaluation-of-a-novel-/)
- Range claims for phone-to-phone BLE vary widely: press says ~100 m / "300 m effective" for bitchat; The Register cites BLE expected outdoor range 55-78 m and Dorsey's own white paper cites ~30 m for local clusters; an informal bitchat/Wi-Fi Aware write-up found indoor BLE < 30 ft (~9 m). — [The Register](https://www.theregister.com/2025/07/08/jack_dorsey_debuts_bitchat/); [TechSpot](https://www.techspot.com/news/108585-jack-dorsey-launches-bitchat-messaging-app-works-without.html); [hackmd grjte bitchat-wifi-aware (snippet only)](https://hackmd.io/@grjte/bitchat-wifi-aware)
- Bluetooth Mesh (SIG standard, flooding) is "prone to broadcast storm, hindering communication reliability for denser deployments"; Ericsson results: >99.9% reliability in most cases, 99.1% in a dense relay deployment with high traffic. — [arXiv 1910.03345](https://arxiv.org/pdf/1910.03345); [Bluetooth SIG blog](https://www.bluetooth.com/?p=3551)

**Apps and SDKs**
- **bitchat** (Jack Dorsey): announced 6 July 2025, iOS App Store 29 July 2025; Android initially via GitHub; BLE mesh, no accounts/servers; Curve25519 + AES-GCM; explicitly pitched for festivals/protests/stadiums. — [TechTarget](https://www.techtarget.com/whatis/feature/What-is-Bitchat); [9to5Mac](https://9to5mac.com/2025/07/07/bitchat-bluetooth-based-app-jack-dorsey/); [Engadget](https://engadget.com/apps/jack-dorsey-just-released-a-bluetooth-messaging-app-that-doesnt-need-the-internet-191023870.html)
- bitchat security: impersonation flaws found right after launch; no forward secrecy initially; GitHub warning "has not received external security review"; Trail of Bits gave a nuanced take. Later release notes claim audit fixes (3 critical, 7 high) but no full public audit report found. — [Trail of Bits blog, 18 Jul 2025](https://blog.trailofbits.com/2025/07/18/building-secure-messaging-is-hard-a-nuanced-take-on-the-bitchat-security-debate/); [IBTimes](https://www.ibtimes.co.uk/jack-dorsey-drops-bitchat-app-store-experts-say-private-app-alarmingly-easy-hack-1739654)
- **Bridgefy SDK**: Android (Kotlin), iOS (Swift), React Native, Flutter. — [Bridgefy FAQ](https://bridgefy.me/faq/). Pricing is usage-based: charged when a user opens the app for the first time in a billing cycle, then the SDK keeps working offline until next cycle. — [Bridgefy SDK Pricing (Notion)](https://bridgefy.notion.site/Bridgefy-SDK-Pricing-22cf443f5ef680039882cd88cedac706). Third-party "$85/month" figure is unverified. — [SpotSaaS](https://www.spotsaas.com/product/bridgefy/pricing)
- Bridgefy security (Royal Holloway / ETH Zurich): 2020 study found missing and incorrectly implemented crypto, info leakage, weak robustness to crafted messages; 2021 follow-up found users still trackable, broadcast messages unauthenticated (impersonation), MITM breaking confidentiality, single crafted message can knock a node out, attack reading ~half of Signal-protected 1:1 messages (main bug fixed 14 Aug 2021). Prof. Martin Albrecht advised avoiding it until regular public third-party audits. No 2025-26 re-audit found. — [Royal Holloway 2020](https://royalholloway.ac.uk/about-us/news/using-messaging-service-bridgefy-could-have-dire-consequences-for-users-if-privacy-protection-issues-aren-t-fixed); [Royal Holloway 2021](https://royalholloway.ac.uk/about-us/news/royal-holloway-cryptographers-urge-caution-over-use-of-secure-messaging-app)
- **Real deployments**: Hong Kong 2019 — Bridgefy usage +3,685% in 60 days (Apptopia), 75,000 downloads in a week in HK; Telegram remained primary. FireChat used in 2014 Umbrella Movement and earlier by festival-goers. — [Silicon Republic](https://siliconrepublic.com/?p=837857); [TNW](https://thenextweb.com/news/how-hong-kong-protesters-are-embracing-offline-messaging-apps-to-avoid-being-snooped-on); [SCMP test](https://www.scmp.com/tech/big-tech/article/3026527/we-tested-messaging-app-used-hong-kong-protesters-works-without)

### Inferences
- A position update (friend ID + lat/lon + timestamp + signature ≈ 60-100 bytes) fits BLE easily; throughput is not the bottleneck — discovery latency in background and relay reach are.
- In a dense crowd (human bodies are mostly water and absorb 2.4 GHz), practical phone-to-phone BLE hops are likely 10-30 m; multi-hop relay is mandatory to cover a festival site. No measured crowd data found (see Gaps).
- On iOS background, iPhone↔iPhone works (overflow area readable by iOS scanners); iPhone(bg)→Android requires either the undocumented overflow bitmask hack, or role inversion (Android advertises, backgrounded iPhone scans for that UUID and connects via GATT), or relaying via a foregrounded phone. Android background BLE scanning is allowed with filters/foreground service (unsourced here; standard Android practice).
- Briar: Android-only, Bluetooth/Wi-Fi/Tor; no iOS app (unsourced / from background knowledge). Berty (Wesh protocol, BLE + Multipeer + Android Nearby, open source) and Meshenger (Android LAN-only calls) — unsourced / from background knowledge, verify. FireChat (Open Garden) appears discontinued (no source found confirming the date).

### Gaps
- No controlled measurement of phone-to-phone BLE range or delivery ratio inside a dense festival crowd was found.
- No independent 2025-26 audit of Bridgefy or bitchat (Android) located; Bridgefy SDK license text not found.
- Battery cost of continuous BLE scan+advertise on iOS/Android not quantified by any source found.
- Whether bitchat delivers reliably iPhone(locked)↔Android in practice was not documented.

---

## Q2. Wi-Fi Aware (NAN): Android support, Apple's iOS 26 framework, does iPhone↔Android work in 2026?

### Takeaway
Android has supported Wi-Fi Aware since 8.0 (device-dependent), and Apple shipped a Wi-Fi Aware framework in iOS 26 (iPhone 12+), worldwide, driven by EU DMA interoperability obligations. In theory this gives a 50-100 m, high-throughput iPhone↔Android link without access point. In practice, as of the latest sources found, developers report iPhone↔Android discovery/pairing failing (Pixel 9, Xiaomi 14, Galaxy S25), and iOS requires a user-mediated one-time pairing (DeviceDiscoveryUI PIN). It is not a background, zero-touch mesh solution for a crowd.

### Cited Findings
- Android: Wi-Fi Aware on Android 8.0 (API 26)+, hardware-dependent (`FEATURE_WIFI_AWARE`); may be unavailable when Wi-Fi/Location disabled or when Wi-Fi Direct, SoftAP or tethering in use; cluster maintenance "consumes resources and battery"; discovery messages ≈255 bytes, unreliable/unordered; data paths give "higher throughput rates across longer distances than Bluetooth"; Android 12 allows multiple point-to-point links and `getAvailableAwareResources()` to count data paths; Android 13 instant communication mode limited to 30 s for power reasons; RTT ranging to peers possible on capable devices; Android 13+ needs `NEARBY_WIFI_DEVICES`. — [Android Developers, Wi-Fi Aware](https://developer.android.com/develop/connectivity/wifi/wifi-aware)
- Apple added Wi-Fi Aware 4.0 support in iOS 26 because the EU Commission's interoperability specifications require it; Apple made the framework available worldwide. — [heise](https://heise.de/-10446649); [MacRumors](https://www.macrumors.com/2025/06/21/ios-26-adding-two-new-wi-fi-features/); [9to5Mac](https://9to5mac.com/2025/06/20/ios-26-to-let-third-party-apps-build-their-own-airdrop-alternative/)
- WWDC25 session 228: pairing is a one-time step (user picks device, confirms PIN on the other), via DeviceDiscoveryUI (app↔app, Apple and third-party devices) or AccessorySetupKit (accessories); system handles key exchange/encryption; hardware iPhone 12 and later. Docs say an app may connect to paired devices "whenever it's running, in both foreground and background", while the session says reconnection works when devices are near and "actively running your application" — ambiguous on background. — [WWDC25 session 228](https://developer.apple.com/videos/play/wwdc2025/228); [Apple WiFiAware docs](https://developer.apple.com/documentation/wifiaware.md)
- Interop reality: iOS 26 iPhone 16 could not discover a service published by Android (Android↔Android worked); reports that Android sends NDP request and Apple doesn't reply; failures with Pixel 9, Xiaomi 14, Galaxy S25. Apple DTS (Quinn) pointed to the Wi-Fi Aware chapter of the *Accessory Design Guidelines* and said compatible hardware/software combos "are rare". — [Apple forums thread 790195](https://developer.apple.com/forums/thread/790195?page=2)
- A later thread seeks collaborators to test iOS 26↔Android Wi-Fi Aware interop for an open-source React Native library; Android side validated, Apple side untested on hardware. — [Apple forums 845528](https://developer.apple.com/forums/thread/845528)
- Informal measurement: Wi-Fi Aware ~110 ft through a wall vs BLE < 30 ft indoors; Wi-Fi Aware typically 50-100 m, >100 m open air. — [hackmd grjte bitchat-wifi-aware (snippet only, page not fetchable)](https://hackmd.io/@grjte/bitchat-wifi-aware)

### Inferences
- Wi-Fi Aware is a good "boost" transport for pre-paired friend groups (pair at entrance while network works), especially Android↔Android and iPhone↔iPhone, but cannot be the baseline cross-platform transport for late 2026 given unresolved interop reports.
- The per-pair PIN pairing makes it unsuitable for relaying through strangers' phones (no anonymous mesh).

### Gaps
- No source confirming a working, shipping iPhone↔Android Wi-Fi Aware app as of late 2026.
- iOS 26 background/locked-screen behavior of Wi-Fi Aware not definitively documented.
- Proportion of Android phones in the field that expose FEATURE_WIFI_AWARE not found.

---

## Q3. Apple Multipeer Connectivity / Network framework, Google Nearby Connections, Quick Share: cross-platform? background?

### Takeaway
These are platform-silo solutions. Multipeer/AWDL is Apple-only; Google Nearby Connections' iOS support is partial (BLE v2 for iOS still an open priority issue) and Android↔iOS links reportedly need a shared Wi-Fi AP. Neither gives a reliable background cross-platform mesh.

### Cited Findings
- Ditto docs: "iOS devices are only able to connect to other iOS devices via Apple Wireless Direct Link"; iOS↔Android connect over standard BLE. — [Ditto docs FAQ (snippet)](https://docs.ditto.live/home/faq)
- Google Nearby Connections: GitHub issue #1619 "Enable BLE v2 support for iOS" open as a priority; maintainer says Google is working on BLE support for iOS for quick offline sharing of small strings; a commenter claims Android↔iOS connections need a shared Wi-Fi AP (unverified). Nearby Messages deprecated (Dec 2023). — [google/nearby issue 1619](https://github.com/google/nearby/issues/1619); [discussion 2447](https://worker-github.shheric.workers.dev/google/nearby/discussions/2447); [Nearby docs](https://developers.google.com/nearby)
- Apple DTS points developers asking about background P2P to background execution limits; P2P networking in background is not generally supported. — [Apple forums 760431](https://developer.apple.com/forums/thread/760431)

### Inferences
- Multipeer Connectivity / Network framework P2P (AWDL) is foreground-oriented and suspended with the app (from background knowledge; consistent with forum thread above). Usable for iPhone↔iPhone foreground "sync burst" when friends meet.
- Quick Share ↔ AirDrop interop: unsourced here; not a third-party app API in any case.

### Gaps
- Current (late 2026) release status of Nearby Connections BLE on iOS not confirmed.

---

## Q4. Offline finding networks (Apple Find My, Google Find Hub, Samsung SmartThings Find) and own crowd-sourced relay networks

### Takeaway
No third-party app can use Apple Find My or Google Find Hub to locate friends' phones; these networks are open only to certified hardware accessories (Apple MFi Find My Network Accessory Program; Google partner tags). Google Find Hub (renamed 2025) now includes people location sharing, but as a Google feature, not an API. An app CAN build its own Find-My-like crowd relay among its own users (anonymized rotating BLE beacons picked up by any app user who has connectivity and uploaded encrypted), but that only helps when someone has backhaul, which is exactly what fails in a saturated stadium.

### Cited Findings
- Apple Find My network open to third-party accessories via MFi and the Find My network accessory specification (launched April 2021); not to apps for locating phones. — [Apple Newsroom 2021](https://www.apple.com/newsroom/2021/04/apples-find-my-network-now-offers-new-third-party-finding-experiences/); [MacRumors guide](https://www.macrumors.com/guide/find-my-network-accessory-program)
- Google Find My Device renamed Find Hub (2025), adds locating family and friends; offline finding network opt-in, with modes "everywhere" or only in busy places; third-party partner tags (Chipolo, Pebblebee, Disney-themed etc.). — [Google blog](https://blog.google/products/android/locate-lost-belongings-find-hub/); [Android.com](https://www.android.com/articles/what-is-find-hub-and-how-to-use-it/); [PhoneArena](https://www.phonearena.com/news/googles-find-my-device-is-now-find-hub-and-its-getting-smarter-with-uwb-and-satellite-support_id170349)
- No public API was found allowing third-party apps to locate phones through either network. — [MacRumors 2020 on Apple restrictions](https://www.macrumors.com/2020/07/24/apples-find-my-under-scrutiny/)

### Inferences
- OpenHaystack (TU Darmstadt SEEMOO, 2021) showed custom BLE devices can piggyback on Find My by emitting crafted keys; this violates Apple terms and requires Apple ID-based report retrieval — not viable for a commercial app (unsourced / from background knowledge).
- Samsung SmartThings Find: no third-party API found (not researched in depth).
- Design pattern worth copying: rotating ephemeral identifiers + end-to-end encrypted location payloads that only friends can decrypt, relayed by any app user (store-and-forward), uploaded later by whoever regains connectivity.

### Gaps
- Samsung SmartThings Find third-party access not verified.

---

## Q5. LoRa / Meshtastic / goTenna-like hardware, wristbands

### Takeaway
Dedicated LoRa hardware (Meshtastic) is the only option proven at festival scale with real numbers (Burning Man ~1,200 user nodes, 28,000 messages/day), with km-level range and GPS on-device, but it requires each user to carry a device paired by BLE to their phone, and the mesh must be tuned (ShortTurbo preset) for density. Only plausible for staff, organizers or a premium/rented accessory, not for the general public.

### Cited Findings
- Burning Mesh: ~1,200 people brought LoRa nodes to Black Rock City; mesh moved 28,000 messages on a Tuesday; playa-wide deployment, ShortTurbo preset. — [Burning Man Innovate showcase](https://innovate.burningman.org/showcase/mesh-messaging-without-wifi-internet-with-burningmesh/); [meshenvy blog](https://meshenvy.org/blog/reno-to-playa); [Burners Without Borders](https://burnerswithoutborders.org/projects/meshtastic-meets-burning-man/)
- Direct range typically up to a few km, extended by relay; Meshtastic developer: "As soon as a local community grows beyond 30 to 40 nodes, you should switch your settings"; dense events move to Short Turbo. — [LWN 2025](https://lwn.net/Articles/1009782); [Wikipedia Meshtastic](https://en.wikipedia.org/wiki/Meshtastic)
- DEF CON hosts the largest known Meshtastic network (~2,000 nodes per attendee reports, unofficial); Ozora 2024 field report with Wio Tracker 1110. — [Meshtastic blog DEF CON tag](https://meshtastic.org/blog/tags/defcon/); [Seeed Studio Ozora report](https://www.seeedstudio.com/blog/2024/08/19/wio-tracker-1110-dev-in-the-wild-transformetional-festival-field-report-from-ozora-24/)

### Inferences
- LoRa airtime is the scarce resource; position broadcast intervals must be long (minutes) in dense meshes; thousands of users would saturate a single channel. Organizer-deployed fixed repeaters (rooftop/stage) are far more effective than user-carried nodes.
- Wristbands: cashless festival wristbands are mostly passive NFC/RFID (no radio relay) — unsourced; a LoRa/BLE active wristband would be a custom hardware project.

### Gaps
- No source found on cashless-wristband providers offering BLE/Wi-Fi location relay; goTenna Mesh consumer status not checked.

---

## Q6. Satellite direct-to-cell / satellite messaging: third-party app access, usability in crowds

### Takeaway
As of 2026, T-Mobile's T-Satellite (Starlink) opened satellite data to a whitelist of third-party apps (WhatsApp, Google Maps, X, AllTrails...) on select iOS 26 / Android 16 phones, US only; Apple's own satellite features are limited to Apple apps, and a developer satellite API is only rumored (Gurman). Not a general solution for a French/European event app, and sky view in a stadium crowd is poor.

### Cited Findings
- T-Mobile expanded T-Satellite to third-party apps (WhatsApp, AllTrails, onX, AccuWeather, Google Maps, CalTopo, X) on select iOS 26 and Android 16 devices; $10/month for non-T-Mobile users. — [GSMArena](https://www.gsmarena.com/tmobile_expands_tsatellite_support_to_thirdparty_apps-news-69782.php); [PhoneArena](https://www.phonearena.com/news/t-mobile-iphone-satellite-data-apps_id174138)
- Apple "discouraging" reliance: satellite data on iOS limited to an Apple-approved list of apps. — [Wccftech](https://wccftech.com/t-mobile-lets-iphone-apps-tap-into-satellite-data-with-ios-26-but-apple-is-not-eager-for-users-to-rely-on-it/amp/)
- Apple reportedly developing a satellite API for third-party apps and 5G NTN (rumors, Jan-Apr 2026). — [MacRumors Apr 2026](https://www.macrumors.com/2026/04/17/iphones-to-get-these-new-satellite-features/); [iClarified, Jan 2026](https://www.iclarified.com/98996/apple-developing-satellitepowered-maps-photo-messaging-and-thirdparty-app-support-for-iphone-gurman)

### Inferences
- Even where available, satellite links need clear sky view and are low bandwidth; inside stadiums or under stage structures unusable; carrier/country-specific. Not a design pillar for a European event app in 2026.

### Gaps
- Skylo (Pixel/Galaxy satellite SOS) third-party data access not verified; European D2C availability not checked.

---

## Q7. Local-first data sync (Ditto, CRDTs, Couchbase Lite) and merging when connectivity returns

### Takeaway
Ditto is the most production-ready commercial SDK for cross-platform mesh sync (BLE between iOS and Android, AWDL iOS↔iOS, LAN, Wi-Fi Aware on Android) with documented best-effort iOS background sync via BLE background modes; used in aviation (e.g. airlines). Pricing for P2P tier is not public. For positions, a simple last-writer-wins per user (timestamped, signed) is sufficient; messages can be an append-only set — a full CRDT library is optional.

### Cited Findings
- Ditto iOS: "best-effort background sync provided Bluetooth LE is enabled and the Bluetooth central and peripheral background modes are enabled"; sync continues in background and when locked if background modes on; Low Power Mode makes it less reliable; devices with same database ID form a mesh on `sync.start()`. — [Ditto FAQ (snippet)](https://docs.ditto.live/home/faq); [Ditto Swift install guide (snippet)](https://docs.ditto.live/sdk/latest/install-guides/swift.md)
- iOS↔iOS uses AWDL; iOS↔Android standard BLE. — [Ditto FAQ (snippet)](https://docs.ditto.live/home/faq)
- Ditto P2P Sync tier = Device Sync plan + self-organizing mesh; no public dollar pricing; free tier 10 cloud device connections, 2 GB. — [Ditto P2P pricing](https://www.ditto.com/pricing/p2p-sync); [Ditto pricing](https://www.ditto.com/pricing)
- Ditto raised $82M (March 2025). — [TechCrunch](https://techcrunch.com/2025/03/12/ditto-lands-82m-to-synchronize-data-from-the-edge-to-the-cloud); MongoDB partnership for edge sync. — [MongoDB blog](https://www.mongodb.com/blog/post/mobile-edge-solutions-with-mongodb-ditto)

### Inferences
- Couchbase Lite P2P (WebSocket over local IP, needs shared network), Automerge/Yjs (data structures only, no transport) — unsourced / from background knowledge.
- Merge strategy: positions = LWW register per user keyed by (user_id, monotonic timestamp/Lamport), keep last N points for trail; messages = grow-only set with dedupe by message ID; on reconnect upload pending records to server, which already resolves LWW. Clock drift between phones must be handled (GPS time is a good common clock).

### Gaps
- Ditto airline customer names, per-device pricing and peer count limits not confirmed (docs host unreachable).

---

## Q8. Security / privacy of peer-relayed location

### Takeaway
Every BLE mesh messenger audited (Bridgefy 2020/2021, bitchat 2025) shipped with authentication/impersonation flaws. For relayed location: E2E encrypt payloads to the friend group, sign them (prevent spoofing), use rotating ephemeral identifiers (prevent tracking of a user by their beacon), and minimize data retained by relays (GDPR: location is personal data; relays should only hold opaque ciphertext with TTL).

### Cited Findings
- Bridgefy: trackable users, unauthenticated broadcasts, MITM, DoS by one crafted message. — [Royal Holloway 2021](https://royalholloway.ac.uk/about-us/news/royal-holloway-cryptographers-urge-caution-over-use-of-secure-messaging-app)
- bitchat: impersonation, no forward secrecy at launch, "fundamental design flaws" per critics; iOS cache-poisoning chain spreading via background sync (reported fixed). — [Trail of Bits](https://blog.trailofbits.com/2025/07/18/building-secure-messaging-is-hard-a-nuanced-take-on-the-bitchat-security-debate/); [IBTimes](https://www.ibtimes.co.uk/jack-dorsey-drops-bitchat-app-store-experts-say-private-app-alarmingly-easy-hack-1739654)
- Academic work on strong anonymity for mesh messaging. — [arXiv 2207.04145](https://arxiv.org/pdf/2207.04145)
- Wi-Fi Aware on iOS: system handles key exchange/encryption after PIN pairing. — [WWDC25 228](https://developer.apple.com/videos/play/wwdc2025/228)

### Inferences
- Pre-share group keys while online (at ticket purchase / entrance), so offline relay needs no key exchange; relays forward ciphertext with TTL/hop limit and rate limits to avoid flooding/DoS.

### Gaps
- No GDPR-specific guidance on P2P location relay found.

---

## Q9. Most robust realistic 2026 design for "my friends still see me (approximately) when 4G is down", iPhone + Android, including background

### Takeaway
No zero-hardware solution gives reliable background iPhone↔Android mesh in 2026. The most robust realistic design is layered: (1) aggressive online design (tiny payloads, retry, use any momentary connectivity + venue Wi-Fi if available); (2) BLE store-and-forward gossip of small signed, E2E-encrypted "last known position + short message" records among all app users, using iOS background BLE modes with state restoration and role inversion/overflow-bitmask tricks for Android, accepting minutes of latency and approximate positions; (3) opportunistic foreground boosts (Wi-Fi Aware/AWDL/Multipeer) when the app is open; (4) optional organizer-deployed infrastructure (venue Wi-Fi/private LTE/BLE or LoRa gateways) which is the only thing that truly fixes a saturated stadium; (5) LoRa devices only for staff/premium.

### Cited Findings
- Ditto demonstrates commercially that iOS background BLE sync with Android is "best-effort" — i.e. not guaranteed. — [Ditto FAQ (snippet)](https://docs.ditto.live/home/faq)
- Contact-tracing apps failed on locked iPhones without Apple's special API; workaround = gossip via Androids/foreground phones. — [BBB](https://bbbprograms.org/media-center/bd/insights/2020/07/09/caution-and-criticism-contact-tracing-through-mobile-apps); [Kin + Carta](https://medium.com/kinandcartacreated/why-bespoke-contact-tracing-apps-dont-work-so-well-on-ios-df0dabd95d42)
- Wi-Fi Aware iPhone↔Android unreliable as of latest reports. — [Apple forums 790195](https://developer.apple.com/forums/thread/790195?page=2)
- LoRa scale-proven only with dedicated hardware. — [Burning Man Innovate](https://innovate.burningman.org/showcase/mesh-messaging-without-wifi-internet-with-burningmesh/)

### Inferences
- Expected UX: "Friend last seen 4 min ago near Stage B (relayed)" rather than live dot. Display age and confidence explicitly.
- Build vs buy: Ditto (commercial, closed, best maintained cross-platform transport) vs Bridgefy (cheap, security history) vs own BLE layer (full control, large engineering effort on iOS edge cases). The relay data model is simple enough that own-built BLE gossip is feasible if the team has native iOS/Android BLE expertise.

### Gaps
- No field data on delivery latency of BLE gossip across 10k-50k phones at a festival.

---

## Q10. What can only work in the foreground?

### Takeaway
Foreground only (or effectively so): Multipeer Connectivity/AWDL sessions, Network-framework P2P, Google Nearby Connections on iOS, fast BLE discovery with duplicate reports (RSSI streams), iOS local name/custom advertising data visible to Android, Wi-Fi Aware discovery on iOS (background status ambiguous), and any continuous high-rate position streaming. Background-capable (degraded): iOS BLE scanning for specific service UUIDs, iOS background advertising (iOS-readable overflow only), GATT read/write/notify wake-ups (~10 s budget), Android BLE with foreground service.

### Cited Findings
- iOS background BLE: duplicates coalesced, slower scan, no local name, UUIDs in overflow, reduced advertising rate, ~10 s per wake-up. — [Apple Core Bluetooth background doc](https://developer.apple.com/library/archive/documentation/NetworkingInternetWeb/Conceptual/CoreBluetooth_concepts/CoreBluetoothBackgroundProcessingForIOSApps/PerformingTasksWhileYourAppIsInTheBackground.html)
- Foreground-only iOS apps cannot scan/discover in background. — [Apple forums summary](https://developer.apple.com/forums/thread/773100)
- Wi-Fi Aware iOS background ambiguous (docs vs session). — [Apple WiFiAware docs](https://developer.apple.com/documentation/wifiaware.md); [WWDC25 228](https://developer.apple.com/videos/play/wwdc2025/228)
- Android Wi-Fi Aware instant mode capped 30 s; cluster costs battery. — [Android Developers](https://developer.android.com/develop/connectivity/wifi/wifi-aware)

### Inferences
- Product pattern: a "Find my friends" screen that, when opened, temporarily switches to high-rate foreground transports; otherwise low-rate background BLE gossip.

### Gaps
- Exact iOS 26 background behaviour of Wi-Fi Aware and of Multipeer under Live Activities not verified.
