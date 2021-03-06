import {Model} from "../../model"
import * as p from "core/properties"
import {union, intersection, sort_by} from "core/util/array"
import {merge} from "core/util/object"
import {Glyph, GlyphView} from "../glyphs/glyph"

export type Indices = number[]

export type MultiIndices = {[key: string]: Indices}

export type ImageIndex = {
  index: number
  dim1: number
  dim2: number
  flat_index: number
}

export namespace Selection {
  export type Attrs = p.AttrsOf<Props>

  export type Props = Model.Props & {
    indices: p.Property<Indices>
    final: p.Property<boolean>
    line_indices: p.Property<Indices>
    selected_glyphs: p.Property<Glyph[]>
    get_view: p.Property<() => GlyphView | null>
    multiline_indices: p.Property<MultiIndices>
    image_indices: p.Property<ImageIndex[]>
  }
}

export interface Selection extends Selection.Attrs {}

export class Selection extends Model {
  properties: Selection.Props

  constructor(attrs?: Partial<Selection.Attrs>) {
    super(attrs)
  }

  static init_Selection(): void {
    this.define<Selection.Props>({
      indices:           [ p.Array,   [] ],
      line_indices:      [ p.Array,   [] ],
      multiline_indices: [ p.Any,     {} ],
    })

    this.internal({
      final:             [ p.Boolean     ],
      selected_glyphs:   [ p.Array,   [] ],
      get_view:          [ p.Any         ],
      image_indices:     [ p.Array,   [] ], // Used internally to support hover tool for now. Python API TBD
    })
  }

  initialize(): void {
    super.initialize()
    this.get_view = () => null
  }

  static from_hits(hits: [number, number][]): Selection {
    const indices = sort_by(hits, ([, dist]) => dist).map(([i]) => i)
    return new Selection({indices})
  }

  get selected_glyph(): Glyph | null {
    return this.selected_glyphs.length > 0 ? this.selected_glyphs[0] : null
  }

  add_to_selected_glyphs(glyph: Glyph): void {
    this.selected_glyphs.push(glyph)
  }

  update(selection: Selection, final: boolean, append: boolean): void {
    this.final = final
    if (append)
      this.update_through_union(selection)
    else {
      this.indices = selection.indices
      this.line_indices = selection.line_indices
      this.selected_glyphs = selection.selected_glyphs
      this.get_view = selection.get_view
      this.multiline_indices = selection.multiline_indices
      this.image_indices = selection.image_indices
    }
  }

  clear(): void {
    this.final = true
    this.indices = []
    this.line_indices = []
    this.multiline_indices = {}
    this.get_view = () => null
    this.selected_glyphs = []
  }

  is_empty(): boolean {
    return this.indices.length == 0 && this.line_indices.length == 0 && this.image_indices.length == 0
  }

  update_through_union(other: Selection): void {
    this.indices = union(other.indices, this.indices)
    this.selected_glyphs = union(other.selected_glyphs, this.selected_glyphs)
    this.line_indices = union(other.line_indices, this.line_indices)
    if(!this.get_view())
      this.get_view = other.get_view
    this.multiline_indices = merge(other.multiline_indices, this.multiline_indices)
  }

  update_through_intersection(other: Selection): void {
    this.indices = intersection(other.indices, this.indices)
    // TODO: think through and fix any logic below
    this.selected_glyphs = union(other.selected_glyphs, this.selected_glyphs)
    this.line_indices = union(other.line_indices, this.line_indices)
    if(!this.get_view())
      this.get_view = other.get_view
    this.multiline_indices = merge(other.multiline_indices, this.multiline_indices)
  }
}
