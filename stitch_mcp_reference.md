# Stitch MCP Server Tool Reference

This reference document contains the full list of tools available in the **Stitch MCP (Model Context Protocol)** integration, including descriptions, parameters, and instructions on how to call them.

---

## 📁 Project Management

### 1. `list_projects`
* **Description:** Lists all Stitch projects accessible to the user. By default, it lists projects owned by the user.
* **Parameters:**
  * `filter` (string, optional): A filter to apply to the list of projects (subset of AIP-160).
    * `view=owned`: Lists only projects owned by the user (default).
    * `view=shared`: Lists only projects shared with the user.

### 2. `create_project`
* **Description:** Creates a new Stitch project, which acts as a container for UI designs and frontend code.
* **Parameters:**
  * `title` (string, optional): The title of the project.

### 3. `get_project`
* **Description:** Retrieves the details of a specific Stitch project using its project name.
* **Parameters:**
  * `name` (string, required): The resource name of the project to retrieve. Format: `projects/{project}` (e.g., `projects/4044680601076201931`).

---

## 📱 Screen & Design Generation

### 4. `list_screens`
* **Description:** Lists all screens within a given Stitch project.
* **Parameters:**
  * `projectId` (string, required): The project ID to list screens for, without the `projects/` prefix (e.g., `4044680601076201931`).

### 5. `get_screen`
* **Description:** Retrieves the details of a specific screen within a project.
* **Parameters:**
  * `name` (string, required): The resource name of the screen. Format: `projects/{project}/screens/{screen}` (e.g., `projects/4044680601076201931/screens/98b50e2ddc9943efb387052637738f61`).
  * `projectId` (string, required, deprecated): The project ID of screen to retrieve.
  * `screenId` (string, required, deprecated): The screen ID of screen to retrieve.

### 6. `generate_screen_from_text`
* **Description:** Generates a new screen within a project from a text prompt.
* **Parameters:**
  * `projectId` (string, required): The project ID to generate the screen for, without the `projects/` prefix.
  * `prompt` (string, required): The input text prompt to generate the screen from.
  * `designSystem` (string, optional): The design system asset ID to use (e.g., `assets/15996705518239280238`).
  * `deviceType` (string, optional): The target device type (`MOBILE`, `DESKTOP`, `TABLET`, `AGNOSTIC`).
  * `modelId` (string, optional): Model to use (`GEMINI_3_FLASH`, `GEMINI_3_1_PRO`, `GEMINI_3_PRO` [deprecated]).
* **Important Instructions:**
  * This action can take a few minutes. **DO NOT RETRY** immediately if it takes time.
  * If it fails with a timeout or connection issue, try to retrieve the screen using `get_screen` every 30 seconds (up to 10 times) before giving up.
  * If `output_components` returns suggestion prompts (e.g. "Yes, make them all"), present these to the user.

### 7. `edit_screens`
* **Description:** Edits existing screens within a project using a text prompt.
* **Parameters:**
  * `projectId` (string, required): The project ID containing the screens.
  * `selectedScreenIds` (array of strings, required): List of screen IDs to edit (without `screens/` prefix).
  * `prompt` (string, required): Prompt detailing the edits.
  * `deviceType` (string, optional): Target device type.
  * `modelId` (string, optional): Model to use.

### 8. `generate_variants`
* **Description:** Generates variants of existing screens within a project using a text prompt.
* **Parameters:**
  * `projectId` (string, required): The project ID containing the screens.
  * `selectedScreenIds` (array of strings, required): Screen IDs to generate variants for.
  * `prompt` (string, required): Prompt detailing the variant specifications.
  * `variantOptions` (object, required):
    * `variantCount` (integer, optional): Number of variants (1-5, default 3).
    * `creativeRange` (string, optional): `REFINE`, `EXPLORE` (default), or `REIMAGINE`.
    * `aspects` (array of strings, optional): Specific aspects to vary (`LAYOUT`, `COLOR_SCHEME`, `IMAGES`, `TEXT_FONT`, `TEXT_CONTENT`).
  * `deviceType` (string, optional): Target device type.
  * `modelId` (string, optional): Model to use.

---

## 🎨 Design System Management

### 9. `list_design_systems`
* **Description:** Lists all design systems for a given project.
* **Parameters:**
  * `projectId` (string, optional): The project ID to list design systems for. If empty, lists global design systems.

### 10. `create_design_system`
* **Description:** Creates a new design system for a project, defining visual branding rules (colors, typography, spacing, shape, appearance mode).
* **Parameters:**
  * `projectId` (string, optional): The project ID.
  * `designSystem` (object, required):
    * `displayName` (string, required): The name of the design system.
    * `theme` (object, required):
      * `colorMode` (string, required): `LIGHT` or `DARK`.
      * `headlineFont` / `bodyFont` / `labelFont` (string): Font families (e.g. `INTER`, `ROBOTO_FLEX`, `OUTFIT`).
      * `customColor` (string, required): Hex color code seed for theme (e.g. `"#ff0000"`).
      * `roundness` (string, required): Element corner roundness (`ROUND_FOUR`, `ROUND_EIGHT`, `ROUND_TWELVE`, `ROUND_FULL`).
      * `colorVariant` (string, optional): `MONOCHROME`, `NEUTRAL`, `TONAL_SPOT`, `VIBRANT`, etc.
      * `overridePrimaryColor` / `overrideSecondaryColor` (string, optional): Hex color overrides.
      * `spacing` (object, optional): Spacing units mapping.
      * `typography` (object, optional): Custom typography scales.
      * `designMd` (string, optional): Markdown describing the design system.
* **Important Instructions:** Call the `update_design_system` tool immediately after creation to apply it to the project and display it in the UI.

### 11. `update_design_system`
* **Description:** Updates an existing design system's configurations for a project.
* **Parameters:**
  * `name` (string, required): Resource name of the design system (e.g., `assets/15996705518239280238`).
  * `projectId` (string, required): The project ID.
  * `designSystem` (object, required): The updated design system configuration object.

### 12. `apply_design_system`
* **Description:** Applies a design system's tokens (colors, fonts, roundness) to a list of screens, updating their style to match.
* **Parameters:**
  * `projectId` (string, required): The project ID.
  * `assetId` (string, required): The design system asset ID.
  * `selectedScreenInstances` (array of objects, required): Screen instances retrieved via `get_project` containing `id` and `sourceScreen`.

### 13. `upload_design_md`
* **Description:** Uploads a `DESIGN.md` file to a Stitch project in preparation for creating a design system.
* **Parameters:**
  * `projectId` (string, required): The project ID.
  * `designMdBase64` (string, required): Base64-encoded UTF-8 content of the `DESIGN.md` file.
* **Important Instructions:** Call `create_design_system_from_design_md` immediately after this tool to finalize the setup.

### 14. `create_design_system_from_design_md`
* **Description:** Creates a design system from a previously uploaded `DESIGN.md` file and displays it in the UI.
* **Parameters:**
  * `projectId` (string, required): The project ID.
  * `selectedScreenInstance` (object, required): The screen instance created by `UploadDesignMd` (with `id` and `sourceScreen`).
  * `deviceType` (string, optional): Target device type.
