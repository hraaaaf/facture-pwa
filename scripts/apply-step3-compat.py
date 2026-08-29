from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]

def replace(path, old, new):
    file = ROOT / path
    text = file.read_text()
    if old not in text:
        raise SystemExit(f'Compatibility anchor missing in {path}')
    file.write_text(text.replace(old, new, 1))

fields = "  dueDate: '',\n  paymentMethod: 'UNSPECIFIED',\n  payments: [],\n"
replace('src/dashboardStats.test.ts', "  globalDiscountPercent: 0,\n  status,\n", "  globalDiscountPercent: 0,\n" + fields + "  status,\n")
replace('src/lib.test.ts', "  globalDiscountPercent: 0,\n  status: 'DRAFT',\n", "  globalDiscountPercent: 0,\n" + fields + "  status: 'DRAFT',\n")
replace('src/referenceFixture.ts', "  globalDiscountPercent: 0,\n  status: 'FINALIZED',\n", "  globalDiscountPercent: 0,\n" + fields + "  status: 'FINALIZED',\n")
print('STEP 3 COMPAT APPLIED')
