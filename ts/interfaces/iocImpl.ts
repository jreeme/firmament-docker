/// <reference path="../../node_modules/inversify-dts/inversify/inversify.d.ts" />
/// <reference path="../../node_modules/reflect-metadata/reflect-metadata.d.ts" />
import {injectable, inject} from "inversify";
import "reflect-metadata";
@injectable()
export class Katana implements IKatana {
  public hit() {
    return "cut!";
  }
}
@injectable()
export class Shuriken implements IShuriken {
  public throw() {
    return "hit!";
  }
}
@injectable()
export class Ninja implements INinja {
  private _katana:IKatana;
  private _shuriken:IShuriken;

  public constructor(@inject("IKatana") katana:IKatana,
                     @inject("IShuriken") shuriken:IShuriken) {
    this._katana = katana;
    this._shuriken = shuriken;
  }

  public fight() {
    return this._katana.hit();
  };

  public sneak() {
    return this._shuriken.throw();
  };
}
@injectable()
export class Ninja2 implements INinja {
  private _katana:IKatana;
  private _shuriken:IShuriken;

  public constructor(@inject("IKatana") katana:IKatana,
                     @inject("IShuriken") shuriken:IShuriken) {
    this._katana = katana;
    this._shuriken = shuriken;
  }

  public fight() {
    return this._katana.hit();
  };

  public sneak() {
    return this._shuriken.throw();
  };
}
