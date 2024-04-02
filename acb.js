const axios = require('axios');

class ACB {
    async login(username, password) {
        const data = {
            clientId: "iuSuHYVufIUuNIREV0FB9EoLn9kHsDbm",
            username,
            password
        };
        try {
            const response = await axios.post('https://apiapp.acb.com.vn/mb/auth/tokens', data, {
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Host': 'apiapp.acb.com.vn'
                }
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    }
    async getsodu(token) {
        try {
            const response = await axios.get('https://apiapp.acb.com.vn/mb/legacy/ss/cs/bankservice/transfers/list/account-payment', {
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Host': 'apiapp.acb.com.vn',
                    'Authorization': `bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    }

    async lsgd(accountNo, rows, token) {
        const url = `https://apiapp.acb.com.vn/mb/legacy/ss/cs/bankservice/saving/tx-history?maxRows=${rows}&account=${accountNo}`;

        try {
            const response = await axios.get(url, {
                headers: {
                    'Content-Type': 'application/json;',
                    'Host': 'apiapp.acb.com.vn',
                    'Authorization': `bearer ${token}`,
                    'User-Agent': 'ACB-MBA/5 CFNetwork/1333.0.4 Darwin/21.5.0',
                    'Accept-Language': 'vi',
                    'x-app-version': '3.7.0'
                }
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    }

    regDevice() {
        const clientid = crypto.randomBytes(16).toString('hex');
        return clientid;
    }
}

module.exports = ACB;

