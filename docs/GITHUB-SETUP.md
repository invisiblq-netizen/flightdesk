# Legg prosjektet på GitHub

Repo-navn: `shared-cockpit-flight-desk`

Forslag til description:

> Windows companion for shared cockpit flying with SimBrief plans, shared crew notes, PF/PM flows, VATSIM information and P2P synchronization. Currently in alpha.

## GitHub Desktop

1. Velg **File → Add local repository** og velg prosjektmappen som inneholder `README.md`, `package.json` og `src`.
2. Velg **Publish repository**. Velg selv om repoet skal være privat eller offentlig.
3. Publiser repoet. Den ferdige installasjonsfilen lastes opp som en Release etterpå.

Mappen som ble klargjort lokalt har et Git-repo. ZIP-utgaven inneholder kildefilene uten `.git`; hvis du bruker ZIP-utgaven, pakk den ut og opprett et repo i den mappen med GitHub Desktop før publisering.

Prosjektfilene skal ligge **ved siden av `.git`**, aldri inni `.git`.

## Hvis du bruker nettsiden

Pakk ut kildekode-ZIP-en først. Opprett et repo og bruk **Add file → Upload files**. Last opp innholdet slik at `README.md` og `package.json` ligger på øverste nivå i repoet. Ta med skjulte filer som `.gitignore`, `.gitattributes` og `.github`.

ZIP-filen skal ikke være den eneste filen i repoet; GitHub og andre utviklere trenger de utpakkede kildefilene.

## Ferdig app og hjelper

Opprett en Release med taggen `v0.3.1-alpha.6`, tittelen **Alpha 0.3.1**, og merk den som en **pre-release**. Bruk `CHANGELOG.md` som utgangspunkt for beskrivelsen.

Legg ved:

- `Shared-Cockpit-Flight-Desk-Setup-0.3.1-alpha.6.exe`
- `FlightPositionBridge-0.3.1-alpha.6-win-x64.zip`
- `SHA256SUMS.txt`

Installereren og simulatorhjelperen legges i Releases fordi de er for store for vanlige repo-filer. Hjelperpakken gjør at en annen utvikler kan gjenbruke den ferdige hjelperen uten å bygge C#-delen.

GitHub har en grense på 100 MiB per vanlig Git-fil og 25 MiB ved opplasting av filer via nettleseren. Se [GitHubs filgrenser](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github).
