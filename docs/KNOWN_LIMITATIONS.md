# Known limitations

- A physical keyboard is required for meaningful practice. Mobile layouts support browsing and review, but touch input cannot build shortcut muscle memory.
- Operating-system shortcuts such as macOS `Cmd + Tab` and Windows `Alt + Tab` cannot be captured reliably by a web page. They are excluded by default and may be enabled only as unscored rehearsal cards.
- Browser-owned shortcuts can occasionally be intercepted by the browser or an installed extension before the page receives them.
- Only macOS and Windows shortcut sets are currently modeled. Linux users can browse the Windows set, but Linux-specific differences are not represented.
- Data is local to one browser profile. There is no account sync, cloud backup, import, or export yet.
- The interface is English/Chinese, but uncommon catalog actions may fall back to their English source label if a translation is missing.
- Sound feedback depends on Web Audio support and browser autoplay policy. Visual and textual feedback remain available when sound is unavailable.
- The scheduler adapts from local accuracy and recency; it is not a spaced-repetition system with calendar-level study planning.
