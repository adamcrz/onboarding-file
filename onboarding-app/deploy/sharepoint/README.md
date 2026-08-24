# SharePoint launcher files

Master copies of what sits in the shared folder:

```
Risk Management Tasks Monthly - Documents/General/Project Onboarding Tool/
├── 1 - INSTALL (run once).bat
├── 2 - START Onboarding Tool.bat
├── settings-template.txt
├── Documents/                   <- the archive; ARCHIVE_DIR points here
└── Repository/onboarding-file/  <- a clone, used when a PC has no git
```

Kept in the repository so they are versioned and can be restored if the shared
folder is disturbed. **`settings-template.txt` here keeps its `PASTE_HERE`
placeholders** — the filled-in copy lives only in SharePoint, because it
carries the database password.

## What the two files do

**INSTALL** is safe to re-run at any time; it repairs whatever is missing and
leaves the rest alone. It installs Node.js and Git through `winget` if they
are absent, fetches the app, writes the settings file, and installs packages.

**START** checks for updates, installs any package an update has introduced,
then runs the app and opens a browser. It repairs rather than sending people
back to the installer — "it broke after the update" becomes a short wait.

Both check packages by asking Node to resolve every dependency the app
declares, rather than checking that `node_modules` exists. A half-finished
install passes the folder check and fails at runtime with a stack trace.

## Why the app installs to `C:\OnboardingTool`

Not into the SharePoint folder, for two measured reasons:

- `node_modules` is ~167 MB across ~7,100 files, which would sync to everyone.
- A representative dependency path inside the library measures **263
  characters** against a Windows limit of 260, so `npm install` fails there.

Documents still go to the SharePoint `Documents` folder. That is the part that
is meant to be shared, and it is what lets a mandate's files be released from
the database once its final export has been taken.
