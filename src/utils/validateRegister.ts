import { UsernamePasswordInput } from "src/resolvers/UsernamePasswordInput"

export const validateRegister = (options: UsernamePasswordInput) => {
    if (!options.email.includes('@')) {
        return [
            {
                field: 'email',
                message: 'Fail ! Invalid email address'
            },
        ];
    }

    if (options.username.length <= 2) {
        return [
            {
                field: 'username',
                message: 'Fail ! Username must contain more than 2 caracters'
            },
        ];
    }
    
    if (options.username.includes('@')) {
        return [
            {
                field: 'username',
                message: 'Fail ! No @ authorized'
            },
        ];
    }

    if (options.password.length <= 2) {
        return [
            {
                field: 'password',
                message: 'Fail ! Password must contain more than 2 caracters'
            },
        ];
    }

    return null;
}