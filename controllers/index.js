const db = require("../models/db");
const fs = require("fs");
const util = require("util");
const validation = require("../libs/validation");
const psw = require("../libs/password");
const path = require("path");
const rename = util.promisify(fs.rename);
const unlink = util.promisify(fs.unlink);

module.exports.index = async (ctx, next) => {
    const products = db.getState().products || [];
    const skills = db.getState().skills || [];
    return await ctx.render("./pages/index", {
        msgemail: ctx.flash.msgemail,
        products,
        skills,
    });
};

module.exports.contact = async (ctx, next) => {
    if (!db.has("contacts").value()) db.set("contacts", []).write();
    db.get("contacts").push(ctx.request.body).write();

    ctx.flash.msgemail = "Контакты отправлены!";
    return await ctx.redirect("/index");
};

module.exports.login = async (ctx, next) => {
    return await ctx.render("./pages/login", { msglogin: ctx.flash.msglogin });
};

module.exports.auth = async (ctx, next) => {
    const { email, password } = ctx.request.body;
    const user = db.getState().user;

    if (user.email === email && psw.validPassword(password)) {
        ctx.session.isAuthorized = true;
        ctx.flash.msglogin = "Авторизация выполнена успешно!";
    } else {
        ctx.flash.msglogin = "Ошибка! Не верный логин или пароль.";
    }
    return await ctx.redirect("/login");
};

module.exports.admin = async (ctx, next) => {
    if (ctx.session.isAuthorized) {
        return await ctx.render("./pages/admin", {
            msgskill: ctx.flash.msgskill,
            msgfile: ctx.flash.msgfile,
        });
    } else {
        return await ctx.redirect("/login");
    }
};

module.exports.skills = async (ctx, next) => {
    const { age, concerts, cities, years } = ctx.request.body;
    const error = validation.validSkillsForm(age, concerts, cities, years);

    if (error) {
        ctx.flash.msgskill = `Ошибка! ${error}`;
    } else {
        db.set("skills", [
            {
                number: age,
                text: "Возраст начала занятий на гитаре",
            },
            {
                number: concerts,
                text: "Концертов отыграл",
            },
            {
                number: cities,
                text: "Максимальное число городов в туре",
            },
            {
                number: years,
                text: "Лет на сцене в качестве гитариста",
            },
        ]).write();
        ctx.flash.msgskill = "Данные обновлены!";
    }
    return await ctx.redirect("/admin");
};

module.exports.products = async (ctx, next) => {
    const { name: title, price } = ctx.request.body;
    const { name, size, path: photoPath } = ctx.request.files.photo;
    const error = validation.validPoductForm(title, price, name, size);

    try {
        if (error) {
            await unlink(photoPath);
            throw new Error(error);
        }
        let fileName = path.join(process.cwd(), "public", "upload", name);
        const errUpload = await rename(photoPath, fileName);
        if (errUpload) throw new Error("При загрузке фото произошла ошибка!");
        if (!db.has("products").value()) db.set("products", []).write();
        db.get("products")
            .push({
                name: title,
                price,
                src: path.join("upload", name),
            })
            .write();
        ctx.flash.msgfile = "Продукт сохранен!";
    } catch (err) {
        ctx.flash.msgfile = err.message;
    }

    return await ctx.redirect("/admin");
};
