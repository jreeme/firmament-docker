import {Kernel} from "inversify";
import {Ninja2, Ninja, Katana, Shuriken} from "./interfaces/iocImpl";
var kernel = new Kernel();
kernel.bind<INinja>("INinja").to(Ninja2);
kernel.bind<IKatana>("IKatana").to(Katana);
kernel.bind<IShuriken>("IShuriken").to(Shuriken);
export default kernel;