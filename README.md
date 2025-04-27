# XSys-Lang - Expert System DSL

## Overview

XSys-Lang is a Domain-Specific Language (DSL) for building expert systems that can evaluate conditions and provide diagnostic results. The compiler transforms `.xsys` files containing rules and conditions into either interactive HTML or structured JSON output.

## Installation

### From Source

1. Clone the repository:
```bash
git clone https://github.com/elhalili/xsys-lang.git
cd xsys-lang
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Usage

### Basic Command

```bash
xsys-lang -i input.xsys -t [html|json] -o output
```

### Options

| Option        | Description                           | Default      |
|---------------|---------------------------------------|--------------|
| `-i, --input` | Input .xsys file (required)          | -            |
| `-t, --type`  | Output type (html/json)              | html         |
| `-o, --output`| Output filename (no extension)       | output       |
| `-T, --title` | Title for HTML output                | Expert System|

### Example Input File (computer.xsys)

```powershell
stmt
    fan_noise = Is your computer making loud fan noises?
    no_boot = Does your computer fail to start up?
    graphics_issues = Are you seeing graphical glitches?
endstmt

results
    overheating = Your system may be overheating
    psu_fault = Power supply unit may be faulty
    gpu_issue = Graphics card needs attention
endresults

rules
    IF fan_noise AND no_boot THEN overheating
    IF no_boot THEN psu_fault
    IF graphics_issues AND (fan_noise OR no_boot) THEN gpu_issue
endrules
```

### Generate HTML Diagnostic Tool

```bash
xpertlang -i computer.xsys -t html -o diagnostic -T "Computer Health Check"
```

### Generate JSON Rules

```bash 
xpertlang -i medical.xsys -t json -o rules
```

## Input File Syntax

1. **Variables Section (`stmt` block)**
   - Define questions/conditions
   - Format: `variable_name = Question text?`

2. **Results Section (`results` block)**
   - Define possible outcomes  
   - Format: `result_name = Diagnostic message`

3. **Rules Section (`rules` block)**
   - Define logical relationships
   - Supports AND, OR, NOT operators
   - Parentheses for grouping
   - Format: `IF condition THEN result`
