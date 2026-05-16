# Security Policy

## VOXIS Security Overview

VOXIS is a real-time spatial interaction engine built with:

* React
* Three.js
* MediaPipe
* Vite

The project uses:

* webcam input
* real-time gesture tracking
* client-side rendering
* local spatial interaction systems

Security, privacy, and runtime stability are considered core priorities during development.

---

# Supported Versions

| Version                      | Supported |
| ---------------------------- | --------- |
| main                         | ✅         |
| legacy experimental branches | ❌         |
| archived prototype branches  | ❌         |

Only the latest `main` branch is considered actively maintained and security-supported.

---

# Reporting a Vulnerability

If you discover a security issue, privacy issue, or exploit:

* Do NOT open a public issue containing sensitive exploit details.
* Report vulnerabilities privately through GitHub Security Advisories or direct repository contact.

Please include:

* vulnerability description
* reproduction steps
* affected files/modules
* screenshots/logs if relevant
* potential impact

---

# Security Goals

VOXIS aims to maintain:

* secure webcam handling
* safe client-side rendering
* stable real-time processing
* controlled resource usage
* minimised attack surface
* modular isolated systems

---

# Current Security Principles

## Webcam Privacy

VOXIS uses webcam access only after explicit browser permission.

No webcam footage is:

* uploaded
* stored remotely
* transmitted to external servers

All gesture and video processing occurs locally in-browser.

---

## Local Processing

MediaPipe inference and rendering systems are processed locally on the client device.

VOXIS currently does not include:

* cloud inference
* remote biometric storage
* user account systems
* server-side tracking

---

## Runtime Stability

The engine architecture prioritises:

* isolated render systems
* controlled render loops
* dirty chunk rebuilding
* adaptive performance scaling
* defensive null-safe logic

This reduces:

* runaway render loops
* memory leaks
* renderer crashes
* unstable frame recursion

---

# Third-Party Dependencies

VOXIS depends on external libraries, including:

* Three.js
* MediaPipe
* React
* Vite

Dependency vulnerabilities may originate from upstream packages.

Always:

* keep dependencies updated
* audit package changes
* Review breaking changes carefully

---

# Unsafe Modifications

The following modifications are strongly discouraged:

* disabling browser security policies
* forcing unrestricted webcam access
* bypassing MediaPipe safety guards
* injecting untrusted scripts
* exposing internal debug endpoints publicly
* rendering unvalidated uploaded assets directly

---

# Experimental Features

Some engine systems are experimental and may change rapidly, including:

* voxel rendering systems
* spatial interaction mapping
* adaptive rendering modes
* gesture-driven controls

Experimental systems should not be treated as production-secure infrastructure.

---

# Performance Safety

VOXIS includes adaptive SAFE/LUXURY rendering modes to reduce:

* GPU overload
* excessive CPU usage
* thermal instability
* browser crashes on weak hardware

Users are encouraged to use SAFE mode on lower-end systems.

---

# Responsible Disclosure

Please provide a reasonable time for investigation and fixes before public disclosure of vulnerabilities.

Constructive reports help improve VOXIS's stability and safety for everyone.

---

# Project Philosophy

VOXIS is designed as a minimalist spatial interaction engine focused on:

* immersive interaction
* controlled rendering
* modular architecture
* realtime responsiveness
* clean system design

Security and stability are treated as foundational engine concerns, not afterthoughts.
