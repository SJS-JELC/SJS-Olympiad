# School deletion retains historical identity

School deletion removes an institution from future selection while retaining its permanent identity, name and reserved normalized name for historical competition and pilot results. Reusing a deleted name restores that same identity rather than creating a second school; a request receipt prevents replay from undoing a later deletion. Physical removal would break those references; silently cascading through teams would bypass their activity-retention rules. Therefore the host is protected, unfinished teams must first use guarded team deletion, and pending allocation plans must finish. Directory and settings fences serialize deletion with allocation and event changes.

Bulk deletion, reselection and Excel import compose existing per-item operations with explicit partial progress, rather than claiming atomicity across team partitions. A release receipt is essential: replaying an uncertain release must not revoke a newly claimed device. This extends ADR 0002's individual roster controls without changing permanent number reservation or team-result retention.

Settings team removal/restoration and API batching are updated by [ADR 0005](0005-fresh-event-teams-and-restoration.md).
