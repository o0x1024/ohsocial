import { writingStyleDAO } from './dao/writing-style-dao'
import { KHAZIX_WRITER_STYLE } from './builtin-styles/khazix-writer'

export function seedBuiltinWritingStyles(): void {
  seedKhazixWriter()
}

function seedKhazixWriter(): void {
  if (writingStyleDAO.getByName(KHAZIX_WRITER_STYLE.name)) return

  const hasDefault = writingStyleDAO.list().some(s => s.isDefault)
  writingStyleDAO.create({
    name: KHAZIX_WRITER_STYLE.name,
    description: KHAZIX_WRITER_STYLE.description,
    promptTemplate: KHAZIX_WRITER_STYLE.promptTemplate,
    referenceText: '',
    dimensions: KHAZIX_WRITER_STYLE.dimensions,
    source: 'builtin',
    isDefault: !hasDefault
  })
}
