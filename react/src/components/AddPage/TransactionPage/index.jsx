/* eslint-disable react/prop-types */
import { postData } from '../../../utils/functions';
import DataContext from '../../DataContext';
import InputWithLabel from '../../InputWithLabel';
import mapper from '../../../utils/mapper';
import RadioButtonWithLabel from '../../RadioButtonWithLabel';
import Scrollpane from '../../Scrollpane';
import SelectWithLabel from '../../SelectWithLabel';
import style from './style.module.css'
import { Transaction } from '../../../models';
import TextAreaWithLabel from '../../TextAreaWithLabel';
import { useState, useEffect, useCallback, useContext } from 'react';
import { useList, useObject } from '../../../utils/hooks';
import { v4 as uuidv4 } from 'uuid';

const TransactionPage = () => {
    const [forms, setForms] = useState([]);
    const [transactions, setTransactions, updateTransaction] = useList([]);
    const dataContext = useContext(DataContext);
    const categories = dataContext.categories;
    const types = dataContext.types;

    useEffect(() => {
        const [transaction, form] = createTransactionAndForm(handleDelete, handleTransactionChange, categories, types);

        setForms([form]);
        setTransactions([transaction]);
    }, [categories, types]);

    const handleDelete = (event) => {
        event.preventDefault();
        const key = event.target.parentNode.parentNode.getAttribute("data-key");
        
        setForms(prevForms => {
            if (prevForms.length > 1) {
                return prevForms.filter(form => form.key !== key);
            }
            return prevForms;
        });

        setTransactions(prevTransactions => {
            if (prevTransactions.length > 1) {
                return prevTransactions.filter(transaction => transaction.key !== key);
            }
            return prevTransactions;
        })
    };

    const handleAdd = useCallback((event) => {
        event.preventDefault();
        const [transaction, form]= createTransactionAndForm(handleDelete, handleTransactionChange, categories, types);

        setForms(prevForms => prevForms.concat(form));
        setTransactions(prevTransactions => prevTransactions.concat([transaction]));
    }, [categories, types]);

    const handleSave = useCallback(async (event) => {
        event.preventDefault();
        
        const transactionsWithoutCategories = transactions.filter(transaction => !transaction.category);
        if (transactionsWithoutCategories.length > 0) {return;}
    
        const uri = `http://localhost:8080/api/transactions`;
        const transactionDTOs = transactions.map(transaction => mapper.mapToTransactionDTO(transaction));
        const savedTransactionDTOs = await postData(uri, transactionDTOs);

        if (savedTransactionDTOs.length > 0) {
            const [transaction, form] = createTransactionAndForm(handleDelete, handleTransactionChange, categories, types);
            setForms(form);
            setTransactions([transaction]);

            const savedTransactions = savedTransactionDTOs.map(savedTransactionDTO => mapper.mapToTransaction(savedTransactionDTO));
            dataContext.addTransactions(savedTransactions);
        }
    }, [transactions, categories]);

    const handleTransactionChange = (attributeName, value, key) => {
        updateTransaction(attributeName, value, key);
    }

    return (
        <>
            <Scrollpane className={style.transactionContainer}>
                <ul>
                    {forms}
                </ul>

                <div className={style.options}>
                    <button className="button" onClick={handleAdd}>Add</button>
                    <button className="button" onClick={handleSave}>Save</button>
                </div>
            </Scrollpane>
        </>
    )
}

const createTransactionAndForm = (handleDelete, handleTransactionChange, categories, types) => {
    const transaction = new Transaction();
    const form = createForm(transaction, handleDelete, handleTransactionChange, categories, types);
    
    transaction.id = 0;
    transaction.key = form.key;
    transaction.identifier = form.key;
    transaction.recurs = false;

    if (types.length > 0) {
        const defaultType = types.filter(type => type.name.toLowerCase() === "expense")[0];
        if (defaultType) {
            transaction.type = defaultType;
        }
    }

    return [transaction, form];
}

const createForm = (transaction, onButtonClick, handleTransactionChange, categories, types) => {
    const id = uuidv4();

    return (
        <li key={id} data-key={id}>
            <Form 
                id={id}
                initialTransaction={transaction} 
                onButtonClick={onButtonClick}
                handleTransactionChange={handleTransactionChange}
                categories={categories}
                types={types}
            />
        </li>
    )
} 

const Form = ({id, initialTransaction, onButtonClick, handleTransactionChange, categories, types}) => {
    const [transaction, __, updateTransaction] = useObject(initialTransaction);
    const names = {
        ['startDate']: `startDate_${id}`,
        ['endDate']: `endDate_${id}`,
        ['type']: `type_${id}`,
        ['category']: `category_${id}`,
        ['recurs']: `recurs_${id}`,
        ['amount']: `amount_${id}`,
        ['notes']: `notes_${id}`
    }

    const handleChange = useCallback((event) => {
        const target = event.target;
        const [attributeName, key] = target.name.split('_');
        let value = target.value;
        
        const pattern = /^[0-9]+$/;
        if (pattern.test(value)) {
            value = Number.parseInt(value);
        }

        if (value === "true" || value === "false") {
            value = value === "true";
        }
        
        if (attributeName === "type") {
            value = types.filter(type => type.id === Number.parseInt(value))[0];
        }

        if (attributeName === "category") {
            value = categories.filter(category => category.id === Number.parseInt(value))[0];
        }

        updateTransaction(attributeName, value);
        handleTransactionChange(attributeName, value, key);
    }, [categories, updateTransaction, handleTransactionChange]);

    return (
        <>
            <form className={style.transactionForm}>
                <div className={style.firstColumn}>
                    <TypeSelection
                        name={names['type']}
                        transaction={transaction}
                        onChange={handleChange}
                        types={types}
                    />

                    <SelectWithLabel 
                        id={names['category']}
                        name={names['category']}
                        text='Category:'
                        items={categories.filter(category => category.type.id === transaction.type.id)}
                        value={transaction.category ? transaction.category.id : null}
                        onChange={handleChange}
                        wrapped={false}
                    />

                    <RecursSelection 
                        names={names}
                        transaction={transaction}
                        onChange={handleChange}
                    />

                    <InputWithLabel
                        id={names['amount']}
                        name={names['amount']}
                        type='number'
                        text='Amount ($):'
                        value={transaction.amount}
                        onChange={handleChange}
                    />
                </div>
                
                <div className={style.secondColumn}>
                    <TextAreaWithLabel 
                        id={names['notes']}
                        name={names['notes']}
                        text="Notes:"
                        className={style.textarea}
                        value={transaction.notes}
                        onChange={handleChange}
                    />
                </div>

                <button 
                    className={style.delete} 
                    onClick={onButtonClick}>
                        -
                </button>
            </form>
        </>
    )
}

const TypeSelection = ({name, transaction, onChange, types}) => {
    return (
        <fieldset>
            <legend>Type:</legend>
            <div>
                {types.map(type => (
                    <RadioButtonWithLabel 
                        key={type.id}
                        name={name}
                        value={type.id}
                        text={type.name}
                        onChange={onChange}
                        checked={transaction.type.id === type.id}
                        wrapped
                    />
                ))}
            </div>
        </fieldset>
    )
}

const RecursSelection = ({names, transaction, onChange}) => {
    return (
        <>
            <fieldset>
                <legend>Recurs:</legend>
                <div>
                    <RadioButtonWithLabel
                        name={names['recurs']}
                        value={true}
                        text='Yes'
                        onChange={onChange}
                        checked={transaction.recurs}
                        wrapped
                    />

                    <RadioButtonWithLabel
                        name={names['recurs']}
                        value={false}
                        text='No'
                        onChange={onChange}
                        checked={!transaction.recurs}
                        wrapped
                    />
                </div>
            </fieldset>
            
            {transaction.recurs ? (
                <>
                    <InputWithLabel 
                        id={names['startDate']}
                        name={names['startDate']}
                        type='date'
                        text='Start Date:'
                        value={transaction.startDate}
                        onChange={onChange}
                    />
                    <InputWithLabel 
                        id={names['endDate']}
                        name={names['endDate']}
                        type='date'
                        text='End Date:'
                        value={transaction.endDate}
                        onChange={onChange}
                    />
                </>
            ) : (
                <InputWithLabel 
                    id={names['startDate']}
                    name={names['startDate']}
                    type='date'
                    text='Date:'
                    value={transaction.startDate}
                    onChange={onChange}
                />
            )}
        </>
    )
}

export default TransactionPage;