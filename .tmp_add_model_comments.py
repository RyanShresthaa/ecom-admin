import re
from pathlib import Path

base = Path(r"C:/Users/Lenovo Loq/Desktop/admin/backend/shared/models")

def action_desc(name):
    n = name.lower()
    if n.startswith(('create','insert','enqueue','add','log','trystart')):
        return 'creates a new record'
    if n.startswith(('find','list','get','fetch','count','sum','map','parse','max')):
        return 'reads and returns records'
    if n.startswith(('update','mark','complete','fail','recompute','replace','decrement','increment')):
        return 'updates existing records'
    if n.startswith(('delete','remove','clear')):
        return 'deletes matching records'
    if n.startswith(('attach','shape')):
        return 'builds enriched response data'
    return 'runs model logic/query operations'

def module_entity(file_path: Path):
    stem = file_path.stem.replace('.model','')
    return stem.replace('model','').strip()

func_pat = re.compile(r'^(\s*)(export\s+)?(async\s+)?function\s+([A-Za-z0-9_]+)\s*\(')

updated = []
for f in sorted(base.glob('*.js')):
    text = f.read_text(encoding='utf-8')
    lines = text.splitlines()
    entity = module_entity(f)

    insert_idx = 0
    for i, line in enumerate(lines):
        s = line.strip()
        if s.startswith('import ') or 'require(' in s or s == '' or s.startswith('//'):
            insert_idx = i + 1
            continue
        insert_idx = i
        break

    module_comment = f"// {entity} model: handles {entity} table/entity CRUD and query helpers."
    if module_comment not in [ln.strip() for ln in lines[:max(insert_idx+2, 6)]]:
        lines.insert(insert_idx, module_comment)

    out = []
    for line in lines:
        m = func_pat.match(line)
        if m:
            name = m.group(4)
            indent = m.group(1)
            cmt = f"{indent}// {entity} model: {name} {action_desc(name)}."
            prev_nonempty = None
            j = len(out) - 1
            while j >= 0:
                if out[j].strip() != '':
                    prev_nonempty = out[j].strip()
                    break
                j -= 1
            if prev_nonempty != cmt.strip():
                out.append(cmt)
        out.append(line)

    new_text = "\n".join(out) + ("\n" if text.endswith("\n") else "")
    if new_text != text:
        f.write_text(new_text, encoding='utf-8')
        updated.append(str(f))

print('UPDATED_FILES')
for p in updated:
    print(p)
print(f'TOTAL_UPDATED={len(updated)}')
