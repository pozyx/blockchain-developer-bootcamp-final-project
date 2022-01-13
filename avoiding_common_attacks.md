# Contract security measures

## SWC-103 (Floating pragma)

Specific compiler pragma `0.8.11` used in contracts to avoid accidental bug inclusion through outdated compiler versions.

## Modifiers used only for validation

All modifiers in contract only validate data with `require` statements.