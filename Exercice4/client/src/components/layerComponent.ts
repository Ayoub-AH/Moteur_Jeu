import { Component } from './component';
import { SpriteComponent } from './spriteComponent';
import { IDisplayComponent } from '../displaySystem';

import { SpriteSheetComponent } from './spriteSheetComponent';
import * as GraphicsAPI from '../graphicsAPI';
import { IEntity } from '../entity';

let GL: WebGLRenderingContext;

// # Classe *LayerComponent*
// Ce composant représente un ensemble de sprites qui
// doivent normalement être considérées comme étant sur un
// même plan.
export class LayerComponent extends Component<Object> implements IDisplayComponent {

  private vertexBuffer : WebGLBuffer;
  private indexBuffer : WebGLBuffer;
  private _vertices = new Array<number>();
  private _indices = new Array<number>();
  private _sprites = new Array<SpriteComponent>();

  setup(){   
    GL = GraphicsAPI.context;

    this.vertexBuffer = GL.createBuffer()!;
    this.indexBuffer = GL.createBuffer()!;
  }

  // ## Méthode *display*
  // La méthode *display* est appelée une fois par itération
  // de la boucle de jeu.
  display(dT: number) {
    //empty arrays
    this._vertices.length = 0;
    this._indices.length = 0;   
    this._sprites.length = 0;

    this.listSprites(this.owner);
    if (this._sprites.length === 0) {
      return;
    }
    const spriteSheet = this._sprites[0].spriteSheet;

    //add sprites
    for(var s of this._sprites){
      this.add(s);
    }

    //update buffers
    GL.bindBuffer(GL.ARRAY_BUFFER, this.vertexBuffer);
    const v = Float32Array.from(this._vertices);
    GL.bufferData(GL.ARRAY_BUFFER, v, GL.DYNAMIC_DRAW);
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    const i = Uint16Array.from(this._indices);
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, i, GL.DYNAMIC_DRAW);

    //draw
    spriteSheet.bind();
    GL.drawElements(GL.TRIANGLES, this._indices.length, GL.UNSIGNED_SHORT, 0);
    spriteSheet.unbind();

    //clean buffers
    GL.bindBuffer(GL.ARRAY_BUFFER, this.vertexBuffer);
    GL.bufferSubData(GL.ARRAY_BUFFER, 0, v);
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    GL.bufferSubData(GL.ELEMENT_ARRAY_BUFFER, 0, i);
  }

  // ## Fonction *listSprites*
  // Cette fonction retourne une liste comportant l'ensemble
  // des sprites de l'objet courant et de ses enfants.
  private listSprites(e : IEntity) {
    e.walkChildren((child) => {
      if (!child.active)
        return;
      child.walkComponent((comp) => {
        if (comp instanceof SpriteComponent && comp.enabled)
          this._sprites.push(comp);
      });
      this.listSprites(child);
    });
  }

  add(s : SpriteComponent){
    this._vertices = this._vertices.concat(Array.prototype.slice.call(s.getVertices()));
    const offset = (this._indices.length / 6) * 4 ;
    const ids = [offset, offset + 1, offset + 2, offset + 2, offset + 3, offset];
    this._indices = this._indices.concat(ids);
  }
}

