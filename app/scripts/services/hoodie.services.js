import PouchDB from 'pouchdb';
import HOODIE from '../helpers/hoodie.helpers.js';
import HoodiePouch from 'pouchdb-hoodie-api';
PouchDB.plugin(HoodiePouch);

//const backUrl = 'http://localhost:6004';
const backUrl = 'https://prototypo.appback.com/_api';

export default class HoodieApi {

	static setup() {
		return new Promise((resolve, reject) => {

			const xhr = new XMLHttpRequest();

			xhr.open('GET', `${backUrl}/_session`);
			xhr.withCredentials = true;

			xhr.onload = (e) => {
				if (e.target.status !== 200) {
					reject(JSON.parse(e.target.responseText));
					return;
				}

				const respJSON = JSON.parse(e.target.responseText);
				if (respJSON.userCtx.name) {
					const id = respJSON.userCtx.roles[0];
					const db = PouchDB(`${backUrl}/user%2F${id}`);
					HoodieApi.instance = db.hoodieApi();
					HoodieApi.instance.hoodieId = id;
					HoodieApi.instance.email = respJSON.userCtx.name.split('/')[1];
					if (HoodieApi.eventSub) {
						_.each(HoodieApi.eventSub['connected'], (cb) => {
							cb();
						});
					}
					resolve();
				}
				else {
					reject();
				}
			}

			xhr.onerror = (e) => {
				reject();
			}

			xhr.send();

		});
	}

	static login(user,password) {
		return new Promise((resolve, reject) => {

			const xhr = new XMLHttpRequest();

			xhr.open('POST', `${backUrl}/_session`);
			xhr.setRequestHeader('Content-type','application/json');
			xhr.withCredentials = true;

			xhr.onload = (e) => {
				if (e.target.status !== 200) {
					reject(JSON.parse(e.target.responseText));
					return;
				}

				const respJSON = JSON.parse(e.target.responseText);
				const id = respJSON.roles[0];
				const db = PouchDB(`${backUrl}/user%2F${id}`);
				HoodieApi.instance = db.hoodieApi();
				HoodieApi.instance.hoodieId = id;
				HoodieApi.instance.email = respJSON.name.split('/')[1];
				if (HoodieApi.eventSub) {
					_.each(HoodieApi.eventSub['connected'], (cb) => {
						cb();
					});
				}
				resolve();
				console.log('We in');
			}

			xhr.onerror = (e) => {
				reject();
				console.log('We not in');
			}

			xhr.send(`{"name":"${user}","password":"${password}"}`);

		});
	}

	static logout() {
		return new Promise((resolve, reject) => {
			const xhr = new XMLHttpRequest();

			xhr.open('DELETE', `${backUrl}/_session`);
			xhr.setRequestHeader('Content-type','application/json');
			xhr.withCredentials = true;

			xhr.onload = (e) => {
				resolve();
				}

			xhr.onerror = (e) => {
				reject();
			}

			xhr.send();

		});
	}

	static register(username, password) {
		return new Promise((resolve, reject) => {
			const xhr = new XMLHttpRequest();

			const hoodieId = Math.random().toString().substr(2);

			const payload = {
				_id:`org.couchdb.user:user/${username}`,
				name:`user/${username}`,
				type:'user',
				roles:[],
				password:password,
				hoodieId,
				database:`user/${hoodieId}`,
				updatedAt:new Date(),
				createdAt:new Date(),
				signedUpAt:new Date(),
			}

			xhr.open('PUT',`${backUrl}/_users/${encodeURIComponent(payload._id)}`);
			xhr.setRequestHeader('Content-type', 'application/json');
			xhr.withCredentials = true;

			xhr.onload = (e) => {
				if (e.target.status !== 201) {
					reject(JSON.parse(e.target.responseText));
					return;
				}

				resolve(e.responseText);
			}

			xhr.reject = (e) => {
				reject();
			}

			xhr.send(JSON.stringify(payload));
		});
	}

	static askPasswordReset(username) {
		return new Promise((resolve, reject) => {

			const resetId = `${username}/${HOODIE.generateId()}`;

			const key = `org.couchdb.user:$passwordReset/${resetId}`;
			const xhr = new XMLHttpRequest();
			const payload = {
				_id:key,
				name:`$passwordReset/${resetId}`,
				type:'user',
				roles:[],
				password:resetId,
				updatedAt:new Date(),
				createdAt:new Date(),
			}

			xhr.open('PUT', `${backUrl}/_users/${encodeURIComponent(key)}`);
			xhr.setRequestHeader('Content-type','application/json');
			xhr.withCredentials = true;

			xhr.onload = (e) => {
				resolve();
			}

			xhr.onerror = (e) => {
				reject();
			}

			xhr.send(JSON.stringify(payload));

		});
		//TODO(franz): Thou shall code the checkPasswordReset at a later point in time
	}

	static changePassword(password) {
		const db = `org.couchdb.user:user/${HoodieApi.instance.email}`;
		return new Promise((resolve, reject) => {
			const xhr = new XMLHttpRequest();

			xhr.open('GET', `${backUrl}/_users/${encodeURIComponent(db)}`);
			xhr.withCredentials = true;

			xhr.onload = (e) => {
				resolve(e)
			}

			xhr.onerror = (e) => {
				reject();
			}

			xhr.send();
		})
		.then((e) => {
			const user = JSON.parse(e.target.responseText);

			user.salt = undefined;
			user.updatedAt = new Date();
			user.password = password;

			return new Promise((resolve, reject) => {
				const xhr = new XMLHttpRequest();
				xhr.open('PUT', `${backUrl}/_users/${encodeURIComponent(db)}`);
				xhr.withCredentials = true;

				xhr.onload = (e) => {
					resolve(e)
				}

				xhr.onerror = (e) => {
					reject();
				}

				xhr.send(JSON.stringify(user));
			});
		})
	}

	static startTask(type, subType, params = {}) {
		params.subType = subType;
		params.id = `$${type}/${type}`;
		params.type = `$${type}`;
		return HoodieApi.instance.add(params);
	}

	static on(event, callback) {
		if (!HoodieApi.eventSub) {
			HoodieApi.eventSub = {};
		}

		if (!HoodieApi.eventSub[event]) {
			HoodieApi.eventSub[event] = [];
		}

		HoodieApi.eventSub[event].push(callback);
	}
}
